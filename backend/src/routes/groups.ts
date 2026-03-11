import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export async function groupRoutes(app: FastifyInstance) {
  // GET /api/groups
  app.get("/api/groups", { preHandler: [requireAuth] }, async (request) => {
    const { search, page, limit } = request.query as {
      search?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page || "1");
    const limitNum = parseInt(limit || "20");
    const offset = (pageNum - 1) * limitNum;

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      let whereClause = "";
      const countBinds: any = {};
      const listBinds: any = { limitNum, offset };

      if (search) {
        whereClause = "WHERE UPPER(g.name) LIKE UPPER(:search)";
        countBinds.search = `%${search}%`;
        listBinds.search = `%${search}%`;
      }

      const countResult = await conn.execute<any>(
        `SELECT COUNT(*) AS total FROM groups g ${whereClause}`,
        countBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const total = countResult.rows?.[0]?.TOTAL || 0;

      const result = await conn.execute<any>(
        `SELECT g.id, g.name, g.description, g.created_at,
                (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count
         FROM groups g
         ${whereClause}
         ORDER BY g.name
         OFFSET :offset ROWS FETCH NEXT :limitNum ROWS ONLY`,
        listBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        groups: (result.rows || []).map((row: any) => ({
          id: row.ID,
          name: row.NAME,
          description: row.DESCRIPTION,
          memberCount: row.MEMBER_COUNT,
          createdAt: row.CREATED_AT,
        })),
        total,
        page: pageNum,
        limit: limitNum,
      };
    });
  });

  // POST /api/groups
  app.post("/api/groups", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { name, description } = request.body as {
      name?: string;
      description?: string;
    };

    if (!name || name.trim().length === 0) {
      return reply.code(400).send({ error: "El nombre es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const id = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO groups (id, tenant_id, name, description)
         VALUES (:id, :tenantId, :name, :description)`,
        {
          id,
          tenantId: request.user.tenantId,
          name: name.trim(),
          description: description || null,
        }
      );

      return reply.code(201).send({
        id,
        name: name.trim(),
        description: description || null,
      });
    });
  });

  // GET /api/groups/:id
  app.get("/api/groups/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id, name, description, created_at FROM groups WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const group = result.rows?.[0];
      if (!group) {
        return reply.code(404).send({ error: "Grupo no encontrado" });
      }

      // Get members
      const membersResult = await conn.execute<any>(
        `SELECT u.id, u.name, u.email, u.avatar_path
         FROM group_members gm
         JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = :groupId
         ORDER BY u.name`,
        { groupId: id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        id: group.ID,
        name: group.NAME,
        description: group.DESCRIPTION,
        createdAt: group.CREATED_AT,
        members: (membersResult.rows || []).map((row: any) => ({
          id: row.ID,
          name: row.NAME,
          email: row.EMAIL,
          avatarPath: row.AVATAR_PATH,
        })),
      };
    });
  });

  // PUT /api/groups/:id
  app.put("/api/groups/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, description } = request.body as {
      name?: string;
      description?: string;
    };

    if (!name || name.trim().length === 0) {
      return reply.code(400).send({ error: "El nombre es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `UPDATE groups SET name = :name, description = :description WHERE id = :id`,
        { name: name.trim(), description: description || null, id }
      );

      if (result.rowsAffected === 0) {
        return reply.code(404).send({ error: "Grupo no encontrado" });
      }

      return { id, name: name.trim(), description: description || null };
    });
  });

  // DELETE /api/groups/:id
  app.delete("/api/groups/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `DELETE FROM groups WHERE id = :id`,
        { id }
      );

      if (result.rowsAffected === 0) {
        return reply.code(404).send({ error: "Grupo no encontrado" });
      }

      return { ok: true };
    });
  });

  // POST /api/groups/:id/members — add member to group
  app.post("/api/groups/:id/members", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };

    if (!userId) {
      return reply.code(400).send({ error: "userId es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Verify group exists
      const groupResult = await conn.execute<any>(
        `SELECT id FROM groups WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!groupResult.rows?.length) {
        return reply.code(404).send({ error: "Grupo no encontrado" });
      }

      try {
        await conn.execute(
          `INSERT INTO group_members (group_id, user_id) VALUES (:groupId, :userId)`,
          { groupId: id, userId }
        );
      } catch (err: any) {
        if (err.errorNum === 1) {
          return reply.code(409).send({ error: "El usuario ya es miembro del grupo" });
        }
        throw err;
      }

      return reply.code(201).send({ ok: true });
    });
  });

  // DELETE /api/groups/:id/members/:userId — remove member from group
  app.delete("/api/groups/:id/members/:userId", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `DELETE FROM group_members WHERE group_id = :groupId AND user_id = :userId`,
        { groupId: id, userId }
      );

      if (result.rowsAffected === 0) {
        return reply.code(404).send({ error: "Miembro no encontrado en el grupo" });
      }

      return { ok: true };
    });
  });
}
