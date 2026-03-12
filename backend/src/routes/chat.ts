import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getEmbedding, chatCompletion } from "../lib/ai.js";

async function generateTitle(
  conn: import("oracledb").Connection,
  conversationId: string,
  userMessage: string,
  assistantMessage: string
): Promise<string | null> {
  try {
    const title = await chatCompletion(
      "Genera un título muy corto (máximo 5 palabras) en español que describa el tema o intención de esta conversación. No resumas los mensajes literalmente, captura la esencia. Si es un saludo genérico sin tema concreto, usa algo como 'Conversación general'. Solo responde con el título, sin comillas ni puntuación final.",
      `Usuario: ${userMessage}\n\nAsistente: ${assistantMessage.slice(0, 300)}`
    );

    if (title) {
      const clean = title.trim().slice(0, 100);
      await conn.execute(
        `UPDATE conversations SET title = :title, updated_at = SYSTIMESTAMP WHERE id = :id`,
        { title: clean, id: conversationId }
      );
      return clean;
    }
    return null;
  } catch (err) {
    console.error("Error generating title:", err);
    return null;
  }
}

export async function chatRoutes(app: FastifyInstance) {
  // POST /api/chat (SSE streaming)
  app.post("/api/chat", { preHandler: [requireAuth] }, async (request, reply) => {
    const { message, conversationId, history = [] } = request.body as {
      message?: string;
      conversationId?: string;
      history?: { role: string; content: string }[];
    };
    const userId = request.user.id;
    const tenantId = request.user.tenantId;

    if (!message || message.trim().length === 0) {
      return reply.code(400).send({ error: "El mensaje no puede estar vacío" });
    }

    // Verify conversation ownership if provided
    if (conversationId) {
      const valid = await withTenant(tenantId, userId, async (conn) => {
        const r = await conn.execute<any>(
          `SELECT user_id FROM conversations WHERE id = :id`,
          { id: conversationId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return r.rows?.[0]?.USER_ID === userId;
      });
      if (!valid) {
        return reply.code(404).send({ error: "Conversación no encontrada" });
      }
    }

    try {
      // Save user message
      if (conversationId) {
        await withTenant(tenantId, userId, async (conn) => {
          await conn.execute(
            `INSERT INTO chat_messages (id, conversation_id, role, content) VALUES (:id, :convId, 'user', :content)`,
            { id: crypto.randomUUID(), convId: conversationId, content: message }
          );
        });
      }

      // 1. Embed the question
      const emb = await getEmbedding(message.trim());
      const queryVec = emb ? new Float32Array(emb) : null;

      // 2. Get inventory of what exists in the association
      let inventoryContext = "";
      await withTenant(tenantId, userId, async (conn) => {
        const docList = await conn.execute<any>(
          `SELECT id, title, status, chunk_count FROM documents ORDER BY created_at DESC FETCH FIRST 20 ROWS ONLY`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const actCount = await conn.execute<any>(
          `SELECT COUNT(*) AS cnt FROM activities`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const albumCount = await conn.execute<any>(
          `SELECT COUNT(*) AS cnt FROM albums`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const docs = docList.rows || [];
        const numActs = actCount.rows?.[0]?.CNT || 0;
        const numAlbums = albumCount.rows?.[0]?.CNT || 0;

        if (docs.length > 0 || numActs > 0 || numAlbums > 0) {
          const parts: string[] = [];
          if (docs.length > 0) {
            const docLines = docs.map((d: any) => {
              const status = d.STATUS === "READY" ? (d.CHUNK_COUNT > 0 ? "procesado" : "sin texto") : d.STATUS === "PROCESSING" ? "procesando" : d.STATUS === "PENDING" ? "pendiente" : "error";
              return `  - "${d.TITLE}" (${status}${d.CHUNK_COUNT > 0 ? `, ${d.CHUNK_COUNT} fragmentos` : ""})`;
            });
            parts.push(`Documentos disponibles (${docs.length}):\n${docLines.join("\n")}`);
          }
          if (numActs > 0) parts.push(`Actividades: ${numActs} registradas`);
          if (numAlbums > 0) parts.push(`Álbumes: ${numAlbums} registrados`);
          inventoryContext = parts.join("\n");
        }
      });

      // 3. Vector search for context
      const sources: any[] = [];

      if (queryVec) {
        await withTenant(tenantId, userId, async (conn) => {
          const vecBind = { val: queryVec, type: oracledb.DB_TYPE_VECTOR };

          const actResult = await conn.execute<any>(
            `SELECT id, title, description, type, status, start_date,
                    VECTOR_DISTANCE(embedding, :qvec, COSINE) AS distance
             FROM activities WHERE embedding IS NOT NULL
             ORDER BY VECTOR_DISTANCE(embedding, :qvec, COSINE)
             FETCH FIRST 5 ROWS ONLY`,
            { qvec: vecBind },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          for (const row of actResult.rows || []) {
            sources.push({
              type: "activity",
              id: row.ID,
              title: row.TITLE,
              description: row.DESCRIPTION,
              extra: `Tipo: ${row.TYPE}, Estado: ${row.STATUS}`,
              distance: row.DISTANCE,
            });
          }

          // Search document chunks (actual content) for RAG
          const chunkResult = await conn.execute<any>(
            `SELECT dc.document_id, dc.content, d.title,
                    VECTOR_DISTANCE(dc.embedding, :qvec, COSINE) AS distance
             FROM document_chunks dc
             JOIN documents d ON d.id = dc.document_id
             WHERE dc.embedding IS NOT NULL
             ORDER BY VECTOR_DISTANCE(dc.embedding, :qvec, COSINE)
             FETCH FIRST 5 ROWS ONLY`,
            { qvec: vecBind },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          for (const row of chunkResult.rows || []) {
            sources.push({
              type: "document",
              id: row.DOCUMENT_ID,
              title: row.TITLE,
              description: row.CONTENT?.substring(0, 500),
              distance: row.DISTANCE,
            });
          }

          // Also search document metadata for docs without chunks
          const docMetaResult = await conn.execute<any>(
            `SELECT id, title, description,
                    VECTOR_DISTANCE(embedding, :qvec, COSINE) AS distance
             FROM documents WHERE embedding IS NOT NULL
             ORDER BY VECTOR_DISTANCE(embedding, :qvec, COSINE)
             FETCH FIRST 3 ROWS ONLY`,
            { qvec: vecBind },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          for (const row of docMetaResult.rows || []) {
            if (!sources.find(s => s.type === "document" && s.id === row.ID)) {
              sources.push({
                type: "document",
                id: row.ID,
                title: row.TITLE,
                description: row.DESCRIPTION,
                distance: row.DISTANCE,
              });
            }
          }

          const albumResult = await conn.execute<any>(
            `SELECT id, title, description,
                    VECTOR_DISTANCE(embedding, :qvec, COSINE) AS distance
             FROM albums WHERE embedding IS NOT NULL
             ORDER BY VECTOR_DISTANCE(embedding, :qvec, COSINE)
             FETCH FIRST 3 ROWS ONLY`,
            { qvec: vecBind },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          for (const row of albumResult.rows || []) {
            sources.push({
              type: "album",
              id: row.ID,
              title: row.TITLE,
              description: row.DESCRIPTION,
              distance: row.DISTANCE,
            });
          }
        });
      }

      // 4. Filter relevant sources (relaxed threshold for chunks with content)
      const relevant = sources
        .filter((s) => s.distance < 0.5)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 8);

      // 5. Build context
      let context = "";
      if (relevant.length > 0) {
        context = relevant
          .map(
            (s, i) =>
              `[${i + 1}] [${s.type}] ${s.title}${s.description ? ": " + s.description : ""}${s.extra ? " (" + s.extra + ")" : ""}`
          )
          .join("\n");
      }

      // Always include inventory so the assistant knows what's available
      if (inventoryContext) {
        context = context
          ? `${context}\n\n--- Inventario de la asociación ---\n${inventoryContext}`
          : `--- Inventario de la asociación ---\n${inventoryContext}`;
      }

      // 6. Build conversation history for LiteLLM
      const historyMessages = history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      const systemPrompt = `Eres el asistente de Bilera, una aplicación de gestión de asociaciones. Tienes acceso a los documentos, actividades y álbumes de la asociación.

Reglas:
- Responde SIEMPRE en español.
- Usa términos en español: "Reunión" en vez de "MEETING", "Tarea" en vez de "TASK", "Evento" en vez de "EVENT", "Pendiente" en vez de "PENDING", "En progreso" en vez de "IN_PROGRESS", "Hecho" en vez de "DONE".
- Si el usuario saluda o hace una pregunta general, responde con naturalidad.
- NUNCA digas que no tienes acceso a documentos o información. Tienes acceso a todo lo que hay en la asociación.
- Si te preguntan por un documento que no existe en el inventario, di que no lo encuentras entre los documentos disponibles y lista los que sí hay.
- Si te preguntan qué documentos hay, lista los del inventario.
- Si un documento está "pendiente" o "procesando", indica que aún se está procesando y que pruebe en unos momentos.
- Si un documento tiene "error" o "sin texto", indica que no se pudo extraer el contenido (puede ser un PDF escaneado).
- Cuando haya contexto relevante de los documentos, úsalo para responder con detalle.
- Sé conciso y directo.`;

      const userMsg = context
        ? `Contexto de la asociación:\n${context}\n\nPregunta: ${message.trim()}`
        : message.trim();

      // 6. Stream via SSE using LiteLLM streaming
      const LITELLM_URL = process.env.LITELLM_URL || "http://litellm:4000";

      const messages_payload = [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: userMsg },
      ];

      const origin = request.headers.origin || process.env.FRONTEND_URL || "http://localhost:3000";
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      });

      const llmRes = await fetch(`${LITELLM_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "chat",
          messages: messages_payload,
          max_tokens: 1024,
          stream: true,
        }),
      });

      if (!llmRes.ok || !llmRes.body) {
        reply.raw.write(`data: ${JSON.stringify({ error: "Error del servicio de IA" })}\n\n`);
        reply.raw.write("data: [DONE]\n\n");
        reply.raw.end();
        return reply;
      }

      let fullText = "";
      const reader = llmRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              reply.raw.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Send sources
      const sourcesPayload = relevant.map((s, i) => ({
        index: i + 1,
        type: s.type,
        id: s.id,
        title: s.title,
        distance: s.distance,
      }));

      if (sourcesPayload.length > 0) {
        reply.raw.write(`data: ${JSON.stringify({ sources: sourcesPayload })}\n\n`);
      }

      // Save assistant message
      if (conversationId) {
        await withTenant(tenantId, userId, async (conn) => {
          await conn.execute(
            `INSERT INTO chat_messages (id, conversation_id, role, content, sources) VALUES (:id, :convId, 'assistant', :content, :sources)`,
            {
              id: crypto.randomUUID(),
              convId: conversationId,
              content: fullText,
              sources: sourcesPayload.length > 0 ? JSON.stringify(sourcesPayload) : null,
            }
          );

          await conn.execute(
            `UPDATE conversations SET updated_at = SYSTIMESTAMP WHERE id = :id`,
            { id: conversationId }
          );

          // Count messages to decide if we generate title
          const countResult = await conn.execute<any>(
            `SELECT COUNT(*) AS cnt FROM chat_messages WHERE conversation_id = :convId`,
            { convId: conversationId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          const messageCount = countResult.rows?.[0]?.CNT || 0;

          if (messageCount === 2) {
            const title = await generateTitle(conn, conversationId, message, fullText);
            if (title) {
              reply.raw.write(`data: ${JSON.stringify({ title })}\n\n`);
            }
          }
        });
      }

      reply.raw.write("data: [DONE]\n\n");
      reply.raw.end();
      return reply;
    } catch (error) {
      console.error("Chat error:", error);
      if (!reply.raw.headersSent) {
        return reply.code(500).send({ error: "Error al procesar la consulta" });
      }
      reply.raw.write(`data: ${JSON.stringify({ error: "Error generando respuesta" })}\n\n`);
      reply.raw.end();
      return reply;
    }
  });
}
