import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

export async function conversationRoutes(app: FastifyInstance) {
  // GET /api/conversations — List user's conversations
  app.get("/api/conversations", { preHandler: [requireAuth] }, async (request) => {
    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id, title, updated_at
         FROM conversations
         WHERE user_id = :userId
         ORDER BY updated_at DESC`,
        { userId: request.user.id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return (result.rows || []).map((row: any) => ({
        id: row.ID,
        title: row.TITLE,
        updatedAt: row.UPDATED_AT,
      }));
    });
  });

  // POST /api/conversations — Create empty conversation
  app.post("/api/conversations", { preHandler: [requireAuth] }, async (request, reply) => {
    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const id = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO conversations (id, tenant_id, user_id)
         VALUES (:id, :tenantId, :userId)`,
        {
          id,
          tenantId: request.user.tenantId,
          userId: request.user.id,
        }
      );

      return reply.code(201).send({
        id,
        title: "Nueva conversación",
        updatedAt: new Date().toISOString(),
      });
    });
  });

  // GET /api/conversations/:id — Detail with messages
  app.get("/api/conversations/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const convResult = await conn.execute<any>(
        `SELECT id, title, user_id, created_at, updated_at
         FROM conversations WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const conv = convResult.rows?.[0];
      if (!conv || conv.USER_ID !== request.user.id) {
        return reply.code(404).send({ error: "Conversación no encontrada" });
      }

      const msgResult = await conn.execute<any>(
        `SELECT id, role, content, sources, created_at
         FROM chat_messages
         WHERE conversation_id = :convId
         ORDER BY created_at ASC`,
        { convId: id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        id: conv.ID,
        title: conv.TITLE,
        userId: conv.USER_ID,
        createdAt: conv.CREATED_AT,
        updatedAt: conv.UPDATED_AT,
        messages: (msgResult.rows || []).map((m: any) => ({
          id: m.ID,
          role: m.ROLE,
          content: m.CONTENT,
          sources: m.SOURCES ? JSON.parse(m.SOURCES) : null,
          createdAt: m.CREATED_AT,
        })),
      };
    });
  });

  // DELETE /api/conversations/:id
  app.delete("/api/conversations/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT user_id FROM conversations WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!check.rows?.length || check.rows[0].USER_ID !== request.user.id) {
        return reply.code(404).send({ error: "Conversación no encontrada" });
      }

      await conn.execute(`DELETE FROM conversations WHERE id = :id`, { id });

      return { ok: true };
    });
  });

  // PATCH /api/conversations/:id — Rename
  app.patch("/api/conversations/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { title } = request.body as { title?: string };

    if (!title || title.trim().length === 0) {
      return reply.code(400).send({ error: "El título no puede estar vacío" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT user_id FROM conversations WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!check.rows?.length || check.rows[0].USER_ID !== request.user.id) {
        return reply.code(404).send({ error: "Conversación no encontrada" });
      }

      await conn.execute(
        `UPDATE conversations SET title = :title, updated_at = SYSTIMESTAMP WHERE id = :id`,
        { id, title: title.trim() }
      );

      return { id, title: title.trim() };
    });
  });
}
