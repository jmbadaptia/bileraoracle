import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { readFile } from "fs/promises";
import path from "path";
import { withTenant, withConnection } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getEmbedding, chatCompletion, estimateTokens } from "../lib/ai.js";
import { trackAiUsage, checkAiCostLimit } from "../lib/ai-usage.js";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, ImageRun, BorderStyle,
} from "docx";

// Detect intent like "última reunión", "último evento", "últimas tareas"
function detectTypeIntent(message: string): { type: string; limit: number } | null {
  const lower = message.toLowerCase();
  const typeMap: Record<string, string> = {
    "reunión": "MEETING", "reuniones": "MEETING",
    "tarea": "TASK", "tareas": "TASK",
    "evento": "EVENT", "eventos": "EVENT",
    "curso": "COURSE", "cursos": "COURSE",
    "actividad": "%", "actividades": "%",
  };
  // "última(s) X", "la última X", "las últimas X"
  const matchLast = lower.match(/[uú]ltim[ao]s?\s+(?:\d+\s+)?(reuni[oó]n(?:es)?|tareas?|eventos?|cursos?|actividades?)/);
  if (matchLast) {
    const word = matchLast[1].replace("ó", "o");
    const key = Object.keys(typeMap).find(k => word.startsWith(k.replace("ó", "o").slice(0, 4)));
    if (key) {
      const numMatch = lower.match(/[uú]ltim[ao]s?\s+(\d+)/);
      return { type: typeMap[key], limit: numMatch ? parseInt(numMatch[1]) : 1 };
    }
  }
  // "qué reuniones hay", "dime las tareas", "lista de eventos"
  const matchList = lower.match(/(?:qu[eé]|lista|dime|cu[aá]les|muestra|ense[ñn]a).*?(reuni[oó]n(?:es)?|tareas?|eventos?|cursos?|actividades?)/);
  if (matchList) {
    const word = matchList[1].replace("ó", "o");
    const key = Object.keys(typeMap).find(k => word.startsWith(k.replace("ó", "o").slice(0, 4)));
    if (key) return { type: typeMap[key], limit: 10 };
  }
  return null;
}

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
      let typeIntent: { type: string; limit: number } | null = null;

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

        // Detect type intent ("última reunión", "qué tareas hay", etc.)
        typeIntent = detectTypeIntent(message.trim());
        if (typeIntent) {
          console.log(`[RAG] Type intent detected: ${typeIntent.type} (limit ${typeIntent.limit})`);
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
        const actList = await conn.execute<any>(
          `SELECT a.id, a.title, a.type, a.status, a.start_date, a.location,
                  (SELECT COUNT(*) FROM activity_attendees aa WHERE aa.activity_id = a.id) AS attendee_count,
                  (SELECT COUNT(*) FROM document_activities da WHERE da.activity_id = a.id) AS doc_count
           FROM activities a ORDER BY a.start_date DESC NULLS LAST FETCH FIRST 20 ROWS ONLY`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const albumCount = await conn.execute<any>(
          `SELECT COUNT(*) AS cnt FROM albums`,
          {},
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const docs = docList.rows || [];
        const acts = actList.rows || [];
        const numAlbums = albumCount.rows?.[0]?.CNT || 0;

        if (docs.length > 0 || acts.length > 0 || numAlbums > 0) {
          const parts: string[] = [];
          if (docs.length > 0) {
            const docLines = docs.map((d: any) => {
              const status = d.STATUS === "READY" ? (d.CHUNK_COUNT > 0 ? "disponible" : "sin contenido extraíble") : d.STATUS === "PROCESSING" ? "procesando" : d.STATUS === "PENDING" ? "pendiente de procesar" : "error al procesar";
              return `  - "${d.TITLE}" (${status})`;
            });
            parts.push(`Documentos disponibles (${docs.length}):\n${docLines.join("\n")}`);
          }
          if (acts.length > 0) {
            const typeMap: Record<string, string> = { MEETING: "Reunión", TASK: "Tarea", EVENT: "Evento", COURSE: "Curso" };
            const statusMap: Record<string, string> = { PENDING: "Pendiente", IN_PROGRESS: "En progreso", DONE: "Hecho", CANCELLED: "Cancelada" };
            const actLines = acts.map((a: any) => {
              const tipo = typeMap[a.TYPE] || a.TYPE;
              const estado = statusMap[a.STATUS] || a.STATUS;
              const fecha = a.START_DATE ? new Date(a.START_DATE).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : "sin fecha";
              const extras: string[] = [];
              if (a.LOCATION) extras.push(a.LOCATION);
              if (a.ATTENDEE_COUNT > 0) extras.push(`${a.ATTENDEE_COUNT} asistentes`);
              if (a.DOC_COUNT > 0) extras.push(`${a.DOC_COUNT} docs`);
              return `  - "${a.TITLE}" (${tipo}, ${estado}, ${fecha}${extras.length > 0 ? ", " + extras.join(", ") : ""})`;
            });
            parts.push(`Actividades (${acts.length}):\n${actLines.join("\n")}`);
          }
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
            `SELECT a.id, a.title, a.description, a.type, a.status, a.priority,
                    a.start_date, a.location,
                    VECTOR_DISTANCE(a.embedding, :qvec, COSINE) AS distance,
                    (SELECT LISTAGG(u.name, ', ') WITHIN GROUP (ORDER BY u.name)
                     FROM activity_attendees aa JOIN users u ON u.id = aa.user_id
                     WHERE aa.activity_id = a.id) AS attendees,
                    (SELECT LISTAGG(t.name, ', ') WITHIN GROUP (ORDER BY t.name)
                     FROM activity_tags at2 JOIN tags t ON t.id = at2.tag_id
                     WHERE at2.activity_id = a.id) AS tags,
                    (SELECT LISTAGG(d.title, ', ') WITHIN GROUP (ORDER BY d.title)
                     FROM document_activities da JOIN documents d ON d.id = da.document_id
                     WHERE da.activity_id = a.id) AS linked_docs
             FROM activities a WHERE a.embedding IS NOT NULL
             ORDER BY VECTOR_DISTANCE(a.embedding, :qvec, COSINE)
             FETCH FIRST 5 ROWS ONLY`,
            { qvec: vecBind },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          for (const row of actResult.rows || []) {
            const typeMap: Record<string, string> = { MEETING: "Reunión", TASK: "Tarea", EVENT: "Evento", COURSE: "Curso" };
            const statusMap: Record<string, string> = { PENDING: "Pendiente", IN_PROGRESS: "En progreso", DONE: "Hecho", CANCELLED: "Cancelada" };
            const tipo = typeMap[row.TYPE] || row.TYPE;
            const estado = statusMap[row.STATUS] || row.STATUS;
            const fecha = row.START_DATE ? new Date(row.START_DATE).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
            const descParts: string[] = [];
            if (row.DESCRIPTION) descParts.push(row.DESCRIPTION);
            descParts.push(`${tipo}, ${estado}`);
            if (fecha) descParts.push(`Fecha: ${fecha}`);
            if (row.LOCATION) descParts.push(`Lugar: ${row.LOCATION}`);
            if (row.PRIORITY && row.PRIORITY !== "MEDIUM") descParts.push(`Prioridad: ${row.PRIORITY}`);
            if (row.ATTENDEES) descParts.push(`Asistentes: ${row.ATTENDEES}`);
            if (row.TAGS) descParts.push(`Etiquetas: ${row.TAGS}`);
            if (row.LINKED_DOCS) descParts.push(`Documentos asociados: ${row.LINKED_DOCS}`);
            sources.push({
              type: "activity",
              id: row.ID,
              title: row.TITLE,
              description: descParts.join(" | "),
              distance: row.DISTANCE,
            });
          }

          // Search document chunks (actual content) for RAG
          const chunkResult = await conn.execute<any>(
            `SELECT dc.document_id, dc.content, d.title, d.visibility,
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
              visibility: row.VISIBILITY,
            });
          }

          // Also search document metadata for docs without chunks
          const docMetaResult = await conn.execute<any>(
            `SELECT id, title, description, visibility,
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
                visibility: row.VISIBILITY,
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
            `SELECT a.id, a.title, a.description, a.type, a.status, a.priority,
                    a.start_date, a.location,
                    (SELECT LISTAGG(u.name, ', ') WITHIN GROUP (ORDER BY u.name)
                     FROM activity_attendees aa JOIN users u ON u.id = aa.user_id
                     WHERE aa.activity_id = a.id) AS attendees,
                    (SELECT LISTAGG(t.name, ', ') WITHIN GROUP (ORDER BY t.name)
                     FROM activity_tags at2 JOIN tags t ON t.id = at2.tag_id
                     WHERE at2.activity_id = a.id) AS tags,
                    (SELECT LISTAGG(d.title, ', ') WITHIN GROUP (ORDER BY d.title)
                     FROM document_activities da JOIN documents d ON d.id = da.document_id
                     WHERE da.activity_id = a.id) AS linked_docs
             FROM activities a
             WHERE a.start_date >= :fromDate AND a.start_date <= :toDate
             ORDER BY a.start_date`,
            { fromDate: temporalRange!.from, toDate: temporalRange!.to },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          for (const row of result.rows || []) {
            if (!sources.find(s => s.type === "activity" && s.id === row.ID)) {
              const typeMap: Record<string, string> = { MEETING: "Reunión", TASK: "Tarea", EVENT: "Evento", COURSE: "Curso" };
              const statusMap: Record<string, string> = { PENDING: "Pendiente", IN_PROGRESS: "En progreso", DONE: "Hecho", CANCELLED: "Cancelada" };
              const tipo = typeMap[row.TYPE] || row.TYPE;
              const estado = statusMap[row.STATUS] || row.STATUS;
              const fecha = row.START_DATE ? new Date(row.START_DATE).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
              const descParts: string[] = [];
              if (row.DESCRIPTION) descParts.push(row.DESCRIPTION);
              descParts.push(`${tipo}, ${estado}`);
              if (fecha) descParts.push(`Fecha: ${fecha}`);
              if (row.LOCATION) descParts.push(`Lugar: ${row.LOCATION}`);
              if (row.ATTENDEES) descParts.push(`Asistentes: ${row.ATTENDEES}`);
              if (row.TAGS) descParts.push(`Etiquetas: ${row.TAGS}`);
              if (row.LINKED_DOCS) descParts.push(`Documentos asociados: ${row.LINKED_DOCS}`);
              sources.push({
                type: "activity",
                id: row.ID,
                title: row.TITLE,
                description: descParts.join(" | "),
                distance: 0,
              });
            }
          }
        });
      }

      // 3c. Type-intent SQL search ("última reunión", "qué tareas hay")
      if (typeIntent) {
        await withTenant(tenantId, userId, async (conn) => {
          const typeFilter = typeIntent!.type === "%" ? "" : "WHERE a.type = :actType";
          const binds: any = {};
          if (typeIntent!.type !== "%") binds.actType = typeIntent!.type;
          const result = await conn.execute<any>(
            `SELECT a.id, a.title, a.description, a.type, a.status, a.priority,
                    a.start_date, a.location,
                    (SELECT LISTAGG(u.name, ', ') WITHIN GROUP (ORDER BY u.name)
                     FROM activity_attendees aa JOIN users u ON u.id = aa.user_id
                     WHERE aa.activity_id = a.id) AS attendees,
                    (SELECT LISTAGG(t.name, ', ') WITHIN GROUP (ORDER BY t.name)
                     FROM activity_tags at2 JOIN tags t ON t.id = at2.tag_id
                     WHERE at2.activity_id = a.id) AS tags,
                    (SELECT LISTAGG(d.title, ', ') WITHIN GROUP (ORDER BY d.title)
                     FROM document_activities da JOIN documents d ON d.id = da.document_id
                     WHERE da.activity_id = a.id) AS linked_docs
             FROM activities a ${typeFilter}
             ORDER BY a.start_date DESC NULLS LAST
             FETCH FIRST :lim ROWS ONLY`,
            { ...binds, lim: typeIntent!.limit },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          for (const row of result.rows || []) {
            if (!sources.find(s => s.type === "activity" && s.id === row.ID)) {
              const typeMap: Record<string, string> = { MEETING: "Reunión", TASK: "Tarea", EVENT: "Evento", COURSE: "Curso" };
              const statusMap: Record<string, string> = { PENDING: "Pendiente", IN_PROGRESS: "En progreso", DONE: "Hecho", CANCELLED: "Cancelada" };
              const tipo = typeMap[row.TYPE] || row.TYPE;
              const estado = statusMap[row.STATUS] || row.STATUS;
              const fecha = row.START_DATE ? new Date(row.START_DATE).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
              const descParts: string[] = [];
              if (row.DESCRIPTION) descParts.push(row.DESCRIPTION);
              descParts.push(`${tipo}, ${estado}`);
              if (fecha) descParts.push(`Fecha: ${fecha}`);
              if (row.LOCATION) descParts.push(`Lugar: ${row.LOCATION}`);
              if (row.ATTENDEES) descParts.push(`Asistentes: ${row.ATTENDEES}`);
              if (row.TAGS) descParts.push(`Etiquetas: ${row.TAGS}`);
              if (row.LINKED_DOCS) descParts.push(`Documentos asociados: ${row.LINKED_DOCS}`);
              sources.push({
                type: "activity",
                id: row.ID,
                title: row.TITLE,
                description: descParts.join(" | "),
                distance: 0,
              });
            }
          }
        });
      }

      // 4. Filter relevant sources
      const sorted = sources.sort((a, b) => a.distance - b.distance);
      console.log(`[RAG] "${message.substring(0, 50)}" → ${sorted.length} sources: ${sorted.map(s => `${s.type}:${s.title}(${s.distance?.toFixed(3)})`).join(", ")}`);
      // NOTE: Cohere multilingual embeddings produce higher distances than other models.
      // Threshold 0.55 filters aggressively to avoid passing irrelevant chunks to the LLM
      // (which causes it to fabricate connections). Tune if switching embedding model.
      const relevant = sorted
        .filter((s) => s.distance < 0.55)
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

Generación de contenido:
- Cuando el usuario pida generar contenido (nota de prensa, comunicado, resumen, post para RRSS, informe, acta, etc.), ANTES de escribirlo pregúntale brevemente: ¿sobre qué actividades o tema? y ¿qué tono prefiere? (formal, cercano, institucional...). Una sola pregunta breve, no un interrogatorio.
- Si el usuario ya especifica el tema ("nota de prensa sobre la Fiesta de la Cosecha") o el periodo ("resumen de abril"), no preguntes — genera directamente.
- El usuario puede descargar tu respuesta como documento Word, así que cuando generes contenido largo, estructúralo bien con títulos, secciones y párrafos claros.

Formato:
- Usa Markdown para estructurar tus respuestas: **negritas** para destacar, listas con - o números para enumerar, y ### para secciones si la respuesta es larga.
- Cuando listes actividades, documentos o elementos, usa siempre listas con viñetas.
- Sé conciso y directo, pero bien estructurado.

Citas:
- IMPORTANTE: Solo cita fuentes numeradas [1], [2], etc. que aparezcan en la sección "Contexto de la asociación" con formato [N]. El inventario de la asociación NO es una fuente citable — no lo cites con [1] ni con ningún número.
- Solo cita las fuentes que realmente uses para responder. No cites fuentes que no hayas utilizado.
- Si las fuentes del contexto no son claramente relevantes para la pregunta del usuario, IGNÓRALAS por completo. No fuerces conexiones indirectas ni rebuscadas entre la pregunta y las fuentes. En ese caso, responde que no tienes información sobre ese tema.`;

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

      // Send only sources that the LLM actually cited in its response
      // SYSTEM documents (e.g. user guide) are used for RAG but hidden from the user
      const allSourcesPayload = relevant.map((s, i) => ({
        index: i + 1,
        type: s.type,
        id: s.id,
        title: s.title,
        distance: s.distance,
        hidden: s.visibility === "SYSTEM",
      }));

      // Find which source indices were cited in the response (e.g. [1], [3])
      const citedIndices = new Set<number>();
      const citationRegex = /\[(\d+)\]/g;
      let match;
      while ((match = citationRegex.exec(fullText)) !== null) {
        const idx = parseInt(match[1]);
        if (idx >= 1 && idx <= allSourcesPayload.length) {
          citedIndices.add(idx);
        }
      }

      // Only send sources that the LLM explicitly cited. No fallback.
      // Filter out SYSTEM documents (user guide etc.) — they provide knowledge but shouldn't be shown
      const sourcesPayload = citedIndices.size > 0
        ? allSourcesPayload.filter(s => citedIndices.has(s.index) && !s.hidden)
        : [];

      if (citedIndices.size > 0) {
        console.log(`[RAG] LLM cited sources: ${[...citedIndices].join(", ")} of ${allSourcesPayload.length} available`);
      }

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

  // POST /api/chat/export — export a chat message as .docx
  app.post("/api/chat/export", { preHandler: [requireAuth] }, async (request, reply) => {
    const { content, title } = request.body as {
      content: string;
      title?: string;
    };
    const tenantId = request.user.tenantId;

    if (!content || content.trim().length === 0) {
      return reply.code(400).send({ error: "El contenido no puede estar vacío" });
    }

    // Get tenant info for header
    let tenantName = "";
    let logoBuffer: Buffer | null = null;
    await withConnection(async (conn) => {
      const r = await conn.execute<any>(
        `SELECT name, logo_path FROM tenants WHERE id = :id`,
        { id: tenantId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (r.rows?.[0]) {
        tenantName = r.rows[0].NAME;
        if (r.rows[0].LOGO_PATH) {
          try {
            const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
            logoBuffer = await readFile(path.join(UPLOAD_DIR, r.rows[0].LOGO_PATH));
          } catch { /* no logo available */ }
        }
      }
    });

    // Parse markdown into docx paragraphs
    const paragraphs: Paragraph[] = [];

    // Header with logo and tenant name
    if (logoBuffer) {
      paragraphs.push(new Paragraph({
        children: [
          new ImageRun({ data: logoBuffer, transformation: { width: 80, height: 80 }, type: "png" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }));
    }
    if (tenantName) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: tenantName, bold: true, size: 28, color: "444444" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }));
    }

    // Title
    if (title) {
      paragraphs.push(new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }));
    }

    // Separator line
    paragraphs.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
      spacing: { after: 200 },
    }));

    // Date
    const dateStr = new Date().toLocaleDateString("es-ES", {
      day: "numeric", month: "long", year: "numeric",
    });
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: dateStr, italics: true, size: 20, color: "888888" })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 300 },
    }));

    // Parse markdown content to paragraphs
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines — add spacing
      if (!trimmed) {
        paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
        continue;
      }

      // Headings
      if (trimmed.startsWith("### ")) {
        paragraphs.push(new Paragraph({
          text: trimmed.slice(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        }));
        continue;
      }
      if (trimmed.startsWith("## ")) {
        paragraphs.push(new Paragraph({
          text: trimmed.slice(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }));
        continue;
      }
      if (trimmed.startsWith("# ")) {
        paragraphs.push(new Paragraph({
          text: trimmed.slice(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 200, after: 100 },
        }));
        continue;
      }

      // Bullet lists
      if (/^[-*]\s/.test(trimmed)) {
        paragraphs.push(new Paragraph({
          children: parseInlineMarkdown(trimmed.slice(2)),
          bullet: { level: 0 },
          spacing: { after: 60 },
        }));
        continue;
      }

      // Numbered lists
      const numMatch = trimmed.match(/^(\d+)\.\s/);
      if (numMatch) {
        paragraphs.push(new Paragraph({
          children: parseInlineMarkdown(trimmed.slice(numMatch[0].length)),
          numbering: { reference: "default-numbering", level: 0 },
          spacing: { after: 60 },
        }));
        continue;
      }

      // Regular paragraph
      paragraphs.push(new Paragraph({
        children: parseInlineMarkdown(trimmed),
        spacing: { after: 120 },
      }));
    }

    // Footer
    paragraphs.push(new Paragraph({ spacing: { after: 300 } }));
    paragraphs.push(new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
      spacing: { before: 200, after: 100 },
    }));
    paragraphs.push(new Paragraph({
      children: [new TextRun({
        text: `Generado por ${tenantName || "Bilera"} — ${dateStr}`,
        italics: true, size: 16, color: "AAAAAA",
      })],
      alignment: AlignmentType.CENTER,
    }));

    const doc = new Document({
      numbering: {
        config: [{
          reference: "default-numbering",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
        }],
      },
      sections: [{ children: paragraphs }],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `${(title || "documento").replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase()}.docx`;

    reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    reply.header("Content-Disposition", `attachment; filename="${fileName}"`);
    return reply.send(buffer);
  });
}

/** Parse inline markdown (**bold**, *italic*) into TextRun array */
function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Remove citation markers like [1], [2] etc.
  const clean = text.replace(/\[(?:Fuente\s*)?\d+(?:\s*,\s*\d+)*\]/g, "");
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: clean.slice(lastIndex, match.index), size: 22 }));
    }
    if (match[2]) {
      // **bold**
      runs.push(new TextRun({ text: match[2], bold: true, size: 22 }));
    } else if (match[3]) {
      // *italic*
      runs.push(new TextRun({ text: match[3], italics: true, size: 22 }));
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < clean.length) {
    runs.push(new TextRun({ text: clean.slice(lastIndex), size: 22 }));
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text: clean, size: 22 }));
  }

  return runs;
}
