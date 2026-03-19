import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getEmbedding, chatCompletion, estimateTokens } from "../lib/ai.js";
import { trackAiUsage, checkAiCostLimit } from "../lib/ai-usage.js";

function detectTemporalRange(message: string): { from: Date; to: Date } | null {
  const lower = message.toLowerCase();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 86400000;

  // "esta semana" = from today to end of week (Sunday)
  if (/esta semana|semana actual/.test(lower)) {
    const dayOfWeek = today.getDay(); // 0=Sun
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const sunday = new Date(today.getTime() + daysUntilSunday * dayMs);
    return { from: today, to: sunday };
  }
  if (/próxima semana|semana que viene/.test(lower)) {
    const dayOfWeek = today.getDay();
    const daysUntilNextMon = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today.getTime() + daysUntilNextMon * dayMs);
    const nextSunday = new Date(nextMonday.getTime() + 6 * dayMs);
    return { from: nextMonday, to: nextSunday };
  }
  if (/este mes|mes actual/.test(lower)) {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: today, to: lastDay };
  }
  if (/pr[oó]ximo mes|mes que viene/.test(lower)) {
    const firstDay = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return { from: firstDay, to: lastDay };
  }
  if (/hoy|de hoy/.test(lower)) {
    return { from: today, to: new Date(today.getTime() + dayMs - 1) };
  }
  if (/mañana/.test(lower)) {
    const tomorrow = new Date(today.getTime() + dayMs);
    return { from: tomorrow, to: new Date(tomorrow.getTime() + dayMs - 1) };
  }
  if (/pr[oó]ximos?\s*(\d+)\s*d[ií]as/.test(lower)) {
    const match = lower.match(/pr[oó]ximos?\s*(\d+)\s*d[ií]as/);
    const days = parseInt(match![1]);
    return { from: today, to: new Date(today.getTime() + days * dayMs) };
  }
  if (/pr[oó]ximos?\s*d[ií]as/.test(lower)) {
    return { from: today, to: new Date(today.getTime() + 7 * dayMs) };
  }
  return null;
}

async function generateTitle(
  conn: import("oracledb").Connection,
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
  tenantId: number,
  userId: string
): Promise<string | null> {
  try {
    const result = await chatCompletion(
      "Genera un título muy corto (máximo 5 palabras) en español que describa el tema o intención de esta conversación. No resumas los mensajes literalmente, captura la esencia. Si es un saludo genérico sin tema concreto, usa algo como 'Conversación general'. Solo responde con el título, sin comillas ni puntuación final.",
      `Usuario: ${userMessage}\n\nAsistente: ${assistantMessage.slice(0, 300)}`
    );

    if (result) {
      trackAiUsage({ tenantId, userId, callType: "TITLE", model: "llama-3.3-70b", inputTokens: result.usage.promptTokens, outputTokens: result.usage.completionTokens });
      const clean = result.content.trim().slice(0, 100);
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

    // Check AI cost limit
    const aiCheck = await checkAiCostLimit(tenantId);
    if (!aiCheck.allowed) {
      return reply.code(429).send({ error: `Has alcanzado el límite mensual de IA ($${aiCheck.limit.toFixed(2)}). Coste actual: $${aiCheck.currentCost.toFixed(2)}.` });
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

      // 1. Rewrite query for better search + embed
      let searchQuery = message.trim();
      let queryVec: Float32Array | null = null;
      let temporalRange: { from: Date; to: Date } | null = null;

      // For short messages ("sí", "vale", "cuéntame más"), use last user message from history as search query
      if (searchQuery.length < 10 && history.length > 0) {
        const lastUserMsg = [...history].reverse().find(m => m.role === "user");
        if (lastUserMsg && lastUserMsg.content.length >= 10) {
          searchQuery = lastUserMsg.content.trim();
          console.log(`[RAG] Short message "${message.trim()}" → using history: "${searchQuery.substring(0, 60)}"`);
        }
      }

      if (searchQuery.length >= 10) {
        // NOTE: Query rewrite via LLM was removed — it often degraded search quality
        // (the LLM generated conversational responses instead of clean search queries).
        // The original user query works better for embeddings. Cohere multilingual
        // handles synonyms well natively. Temporal queries are handled by detectTemporalRange().
        // If rewrite is needed in the future, use a stricter prompt with few-shot examples
        // and validate the output is a clean query (not a conversational response).

        // Detect temporal intent for hybrid SQL search
        const temporal = detectTemporalRange(message.trim());
        if (temporal) {
          temporalRange = temporal;
          console.log(`[RAG] Temporal range detected: ${temporal.from.toISOString()} → ${temporal.to.toISOString()}`);
        }

        const embResult = await getEmbedding(searchQuery);
        if (embResult) {
          queryVec = new Float32Array(embResult.embedding);
          trackAiUsage({ tenantId, userId, callType: "EMBEDDING", model: "cohere-embed-v3", inputChars: embResult.usage.inputChars });
        }
      }

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
              const status = d.STATUS === "READY" ? (d.CHUNK_COUNT > 0 ? "disponible" : "sin contenido extraíble") : d.STATUS === "PROCESSING" ? "procesando" : d.STATUS === "PENDING" ? "pendiente de procesar" : "error al procesar";
              return `  - "${d.TITLE}" (${status})`;
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

      // 3b. Hybrid: temporal SQL search for date-based queries
      if (temporalRange) {
        await withTenant(tenantId, userId, async (conn) => {
          const result = await conn.execute<any>(
            `SELECT id, title, description, type, status, priority, start_date, location
             FROM activities
             WHERE start_date >= :fromDate AND start_date <= :toDate
             ORDER BY start_date`,
            { fromDate: temporalRange!.from, toDate: temporalRange!.to },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          for (const row of result.rows || []) {
            // Avoid duplicates from vector search
            if (!sources.find(s => s.type === "activity" && s.id === row.ID)) {
              const dateStr = row.START_DATE ? new Date(row.START_DATE).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) : "";
              sources.push({
                type: "activity",
                id: row.ID,
                title: row.TITLE,
                description: `${row.DESCRIPTION || ""} | ${row.TYPE} | ${row.STATUS} | ${dateStr}${row.LOCATION ? ` | ${row.LOCATION}` : ""}`.trim(),
                extra: `Fecha: ${dateStr}, Estado: ${row.STATUS}`,
                distance: 0, // exact SQL match = highest relevance
              });
            }
          }
        });
      }

      // 4. Filter relevant sources
      const sorted = sources.sort((a, b) => a.distance - b.distance);
      console.log(`[RAG] "${message.substring(0, 50)}" → ${sorted.length} sources: ${sorted.map(s => `${s.type}:${s.title}(${s.distance?.toFixed(3)})`).join(", ")}`);
      // NOTE: Cohere multilingual embeddings produce higher distances than other models.
      // Threshold 0.65 works well for relevance. Tune if switching embedding model.
      const relevant = sorted
        .filter((s) => s.distance < 0.65)
        .slice(0, 8);
      if (relevant.length > 0) {
        console.log(`[RAG] ${relevant.length} relevant (threshold <0.65): ${relevant.map(s => `${s.title}(${s.distance?.toFixed(3)})`).join(", ")}`);
      } else {
        console.log(`[RAG] No relevant sources found`);
      }

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
- Si un documento está "pendiente de procesar" o "procesando", indica que aún se está procesando y que pruebe en unos momentos.
- Si un documento tiene "error" o "sin contenido extraíble", indica que no se pudo extraer el contenido.
- Cuando haya contexto relevante de los documentos, ÚSALO DIRECTAMENTE para responder. No digas que "tienes fragmentos" o "podrías buscarlo" — ya lo tienes, responde con el contenido.
- Si el usuario dice "sí", "vale", "cuéntame más", "adelante" o similar, interpreta que quiere que continúes con lo que estabas hablando. NO le pidas que repita la pregunta.
- NUNCA inventes información que no esté en el contexto proporcionado. Si no tienes datos sobre algo, di claramente que no hay información disponible sobre ese tema en el sistema.
- No inventes nombres de actividades, documentos, eventos ni datos que no aparezcan en el contexto.
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
          stream_options: { include_usage: true },
        }),
      });

      if (!llmRes.ok || !llmRes.body) {
        reply.raw.write(`data: ${JSON.stringify({ error: "Error del servicio de IA" })}\n\n`);
        reply.raw.write("data: [DONE]\n\n");
        reply.raw.end();
        return reply;
      }

      let fullText = "";
      let streamUsage: { prompt_tokens?: number; completion_tokens?: number } | null = null;
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
            if (parsed.usage) {
              streamUsage = parsed.usage;
            }
            const choice = parsed.choices?.[0];
            const finish = choice?.finish_reason;
            const delta = choice?.delta?.content;
            if (delta) {
              // Some providers (e.g. OCI/Cohere) send a final chunk with
              // finish_reason containing the complete response — skip it
              if (finish) {
                console.log(`[STREAM SKIP] final chunk (${delta.length} chars)`);
              } else {
                fullText += delta;
                reply.raw.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
              }
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Track streaming chat usage
      const allInputText = messages_payload.map(m => m.content).join("");
      trackAiUsage({
        tenantId, userId, callType: "CHAT", model: "llama-3.3-70b",
        inputTokens: streamUsage?.prompt_tokens ?? estimateTokens(allInputText),
        outputTokens: streamUsage?.completion_tokens ?? estimateTokens(fullText),
      });

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
            const title = await generateTitle(conn, conversationId, message, fullText, tenantId, userId);
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
