import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getEmbedding, chatCompletion } from "../lib/ai.js";
import { trackAiUsage, checkAiCostLimit } from "../lib/ai-usage.js";

export async function aiRoutes(app: FastifyInstance) {
  // POST /api/ai/chat — RAG: search context + LLM answer
  app.post("/api/ai/chat", { preHandler: [requireAuth] }, async (request, reply) => {
    const { question } = request.body as { question?: string };

    if (!question || question.trim().length < 3) {
      return reply.code(400).send({ error: "La pregunta debe tener al menos 3 caracteres" });
    }

    // Check AI cost limit
    const aiCheck = await checkAiCostLimit(request.user.tenantId);
    if (!aiCheck.allowed) {
      return reply.code(429).send({ error: `Has alcanzado el límite mensual de IA ($${aiCheck.limit.toFixed(2)}). Coste actual: $${aiCheck.currentCost.toFixed(2)}.` });
    }

    // 1. Embed the question
    const embResult = await getEmbedding(question.trim());
    if (!embResult) {
      return reply.code(503).send({ error: "Servicio de IA no disponible" });
    }
    trackAiUsage({ tenantId: request.user.tenantId, userId: request.user.id, callType: "EMBEDDING", model: "cohere-embed-v3", inputChars: embResult.usage.inputChars });
    const queryVec = new Float32Array(embResult.embedding);

    // 2. Vector search for context
    const sources: any[] = [];
    await withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const vecBind = { val: queryVec, type: oracledb.DB_TYPE_VECTOR };

      // Top activities
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

      // Top documents
      const docResult = await conn.execute<any>(
        `SELECT id, title, description,
                VECTOR_DISTANCE(embedding, :qvec, COSINE) AS distance
         FROM documents WHERE embedding IS NOT NULL
         ORDER BY VECTOR_DISTANCE(embedding, :qvec, COSINE)
         FETCH FIRST 3 ROWS ONLY`,
        { qvec: vecBind },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      for (const row of docResult.rows || []) {
        sources.push({
          type: "document",
          id: row.ID,
          title: row.TITLE,
          description: row.DESCRIPTION,
          distance: row.DISTANCE,
        });
      }

      // Top albums
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

    // 3. Filter relevant sources (distance < 0.35 = genuinely related)
    const relevant = sources
      .filter(s => s.distance < 0.35)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);

    // 4. Build context
    const context = relevant.length > 0
      ? relevant.map(s => `[${s.type}] ${s.title}${s.description ? ': ' + s.description : ''}${s.extra ? ' (' + s.extra + ')' : ''}`).join("\n")
      : "";

    // 5. Chat completion
    const systemPrompt = `Eres un asistente amable para una asociación. Reglas:
- Responde SIEMPRE en español.
- Usa términos en español: "Reunión" en vez de "MEETING", "Tarea" en vez de "TASK", "Evento" en vez de "EVENT", "Pendiente" en vez de "PENDING", "En progreso" en vez de "IN_PROGRESS", "Hecho" en vez de "DONE".
- Si el usuario saluda o hace una pregunta general (hola, qué tal, etc.), responde con naturalidad sin forzar datos del contexto.
- Si hay contexto relevante, úsalo para responder. Si no lo hay o no es relevante para la pregunta, no lo menciones.
- Sé conciso y directo.`;

    const userMsg = context
      ? `Contexto de la asociación:\n${context}\n\nPregunta: ${question.trim()}`
      : question.trim();

    const chatResult = await chatCompletion(systemPrompt, userMsg);

    if (!chatResult) {
      return reply.code(503).send({ error: "Servicio de IA no disponible" });
    }

    trackAiUsage({ tenantId: request.user.tenantId, userId: request.user.id, callType: "CHAT", model: "llama-3.3-70b", inputTokens: chatResult.usage.promptTokens, outputTokens: chatResult.usage.completionTokens });

    return {
      answer: chatResult.content,
      sources: relevant.map(s => ({ type: s.type, id: s.id, title: s.title, distance: s.distance })),
    };
  });

  // POST /api/ai/summarize — Summarize an activity
  app.post("/api/ai/summarize", { preHandler: [requireAuth] }, async (request, reply) => {
    const { activityId } = request.body as { activityId?: string };

    if (!activityId) {
      return reply.code(400).send({ error: "activityId requerido" });
    }

    // Check AI cost limit
    const aiCheck = await checkAiCostLimit(request.user.tenantId);
    if (!aiCheck.allowed) {
      return reply.code(429).send({ error: `Has alcanzado el límite mensual de IA ($${aiCheck.limit.toFixed(2)}). Coste actual: $${aiCheck.currentCost.toFixed(2)}.` });
    }

    const activityData = await withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT a.title, a.description, a.type, a.status, a.priority, a.start_date, a.location,
                u.name AS owner_name
         FROM activities a
         LEFT JOIN users u ON u.id = a.owner_id
         WHERE a.id = :id`,
        { id: activityId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const row = result.rows?.[0];
      if (!row) return null;

      // Attendees
      const attResult = await conn.execute<any>(
        `SELECT u.name FROM activity_attendees aa JOIN users u ON u.id = aa.user_id WHERE aa.activity_id = :id`,
        { id: activityId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Tags
      const tagResult = await conn.execute<any>(
        `SELECT t.name FROM activity_tags at2 JOIN tags t ON t.id = at2.tag_id WHERE at2.activity_id = :id`,
        { id: activityId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        title: row.TITLE,
        description: row.DESCRIPTION,
        type: row.TYPE,
        status: row.STATUS,
        priority: row.PRIORITY,
        startDate: row.START_DATE,
        location: row.LOCATION,
        ownerName: row.OWNER_NAME,
        attendees: (attResult.rows || []).map((a: any) => a.NAME),
        tags: (tagResult.rows || []).map((t: any) => t.NAME),
      };
    });

    if (!activityData) {
      return reply.code(404).send({ error: "Actividad no encontrada" });
    }

    const details = [
      `Título: ${activityData.title}`,
      `Tipo: ${activityData.type}`,
      `Estado: ${activityData.status}`,
      `Prioridad: ${activityData.priority}`,
      activityData.location ? `Lugar: ${activityData.location}` : null,
      activityData.startDate ? `Fecha: ${activityData.startDate}` : null,
      activityData.ownerName ? `Responsable: ${activityData.ownerName}` : null,
      activityData.attendees.length ? `Asistentes: ${activityData.attendees.join(", ")}` : null,
      activityData.tags.length ? `Etiquetas: ${activityData.tags.join(", ")}` : null,
      activityData.description ? `Descripción: ${activityData.description}` : null,
    ].filter(Boolean).join("\n");

    const summaryResult = await chatCompletion(
      "Eres un asistente para una asociación. Genera un resumen conciso en español (2-3 frases) de la siguiente actividad.",
      details
    );

    if (!summaryResult) {
      return reply.code(503).send({ error: "Servicio de IA no disponible" });
    }

    trackAiUsage({ tenantId: request.user.tenantId, userId: request.user.id, callType: "SUMMARY", model: "llama-3.3-70b", inputTokens: summaryResult.usage.promptTokens, outputTokens: summaryResult.usage.completionTokens });

    return { summary: summaryResult.content };
  });
}
