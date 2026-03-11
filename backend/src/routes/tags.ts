import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

export async function tagRoutes(app: FastifyInstance) {
  // GET /api/tags
  app.get("/api/tags", { preHandler: [requireAuth] }, async (request) => {
    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id, name, color FROM tags ORDER BY name`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        tags: (result.rows || []).map((row: any) => ({
          id: row.ID,
          name: row.NAME,
          color: row.COLOR,
        })),
      };
    });
  });

  // POST /api/tags
  app.post("/api/tags", { preHandler: [requireAuth] }, async (request, reply) => {
    const { name, color } = request.body as { name?: string; color?: string };

    if (!name || name.trim().length === 0) {
      return reply.code(400).send({ error: "El nombre es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const id = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO tags (id, tenant_id, name, color) VALUES (:id, :tenantId, :name, :color)`,
        {
          id,
          tenantId: request.user.tenantId,
          name: name.trim(),
          color: color || null,
        }
      );

      return reply.code(201).send({
        id,
        name: name.trim(),
        color: color || null,
      });
    });
  });
}
