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
                (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) +
                (SELECT COUNT(*) FROM group_participants gp WHERE gp.group_id = g.id) AS member_count
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

      // Get user members (legacy table)
      const usersResult = await conn.execute<any>(
        `SELECT u.id, u.name, u.email, u.avatar_path
         FROM group_members gm JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = :groupId ORDER BY u.name`,
        { groupId: id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Get participants (socios + contacts)
      const participantsResult = await conn.execute<any>(
        `SELECT gp.id AS participant_id, gp.member_type, gp.member_id FROM group_participants gp WHERE gp.group_id = :groupId`,
        { groupId: id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Resolve names for socios and contacts
      const members: any[] = [];

      // Users
      for (const u of usersResult.rows || []) {
        members.push({ id: u.ID, name: u.NAME, email: u.EMAIL, avatarPath: u.AVATAR_PATH, memberType: "USER", participantId: null });
      }

      // Socios + Contacts from group_participants
      for (const p of participantsResult.rows || []) {
        if (p.MEMBER_TYPE === "USER") {
          // Also check if already added from group_members
          if (!members.find(m => m.id === p.MEMBER_ID)) {
            const uResult = await conn.execute<any>(`SELECT id, name, email FROM users WHERE id = :id`, { id: p.MEMBER_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            const u = uResult.rows?.[0];
            if (u) members.push({ id: u.ID, name: u.NAME, email: u.EMAIL, memberType: "USER", participantId: p.PARTICIPANT_ID });
          }
        } else if (p.MEMBER_TYPE === "SOCIO") {
          const sResult = await conn.execute<any>(`SELECT id, nombre, apellidos, email FROM socios WHERE id = :id`, { id: p.MEMBER_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
          const s = sResult.rows?.[0];
          if (s) members.push({ id: s.ID, name: [s.NOMBRE, s.APELLIDOS].filter(Boolean).join(" "), email: s.EMAIL, memberType: "SOCIO", participantId: p.PARTICIPANT_ID });
        } else if (p.MEMBER_TYPE === "CONTACT") {
          const cResult = await conn.execute<any>(`SELECT id, name, email FROM contacts WHERE id = :id`, { id: p.MEMBER_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
          const c = cResult.rows?.[0];
          if (c) members.push({ id: c.ID, name: c.NAME, email: c.EMAIL, memberType: "CONTACT", participantId: p.PARTICIPANT_ID });
        }
      }

      return {
        id: group.ID,
        name: group.NAME,
        description: group.DESCRIPTION,
        createdAt: group.CREATED_AT,
        members,
      };
    });
  });

  // PUT /api/groups/:id
  app.put("/api/groups/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, description } = request.body as { name?: string; description?: string };

    if (!name || name.trim().length === 0) {
      return reply.code(400).send({ error: "El nombre es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `UPDATE groups SET name = :name, description = :description WHERE id = :id`,
        { name: name.trim(), description: description || null, id }
      );
      if (result.rowsAffected === 0) return reply.code(404).send({ error: "Grupo no encontrado" });
      return { id, name: name.trim(), description: description || null };
    });
  });

  // DELETE /api/groups/:id
  app.delete("/api/groups/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(`DELETE FROM groups WHERE id = :id`, { id });
      if (result.rowsAffected === 0) return reply.code(404).send({ error: "Grupo no encontrado" });
      return { ok: true };
    });
  });

  // POST /api/groups/:id/members — add member (user, socio, or contact)
  app.post("/api/groups/:id/members", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId, memberId, memberType } = request.body as { userId?: string; memberId?: string; memberType?: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Verify group exists
      const groupResult = await conn.execute<any>(`SELECT id FROM groups WHERE id = :id`, { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      if (!groupResult.rows?.length) return reply.code(404).send({ error: "Grupo no encontrado" });

      // Legacy: userId only (backward compat)
      if (userId && !memberType) {
        try {
          await conn.execute(`INSERT INTO group_members (group_id, user_id) VALUES (:groupId, :userId)`, { groupId: id, userId });
        } catch (err: any) {
          if (err.errorNum === 1) return reply.code(409).send({ error: "Ya es miembro del grupo" });
          throw err;
        }
        return reply.code(201).send({ ok: true });
      }

      // New: memberId + memberType
      const mId = memberId || userId;
      const mType = memberType || "USER";
      if (!mId) return reply.code(400).send({ error: "memberId es obligatorio" });

      try {
        await conn.execute(
          `INSERT INTO group_participants (id, group_id, member_type, member_id) VALUES (:id, :groupId, :memberType, :memberId)`,
          { id: crypto.randomUUID(), groupId: id, memberType: mType, memberId: mId }
        );
      } catch (err: any) {
        if (err.errorNum === 1) return reply.code(409).send({ error: "Ya es miembro del grupo" });
        throw err;
      }

      return reply.code(201).send({ ok: true });
    });
  });

  // DELETE /api/groups/:id/members/:memberId — remove member
  app.delete("/api/groups/:id/members/:memberId", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id, memberId } = request.params as { id: string; memberId: string };
    const { memberType } = request.query as { memberType?: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Try legacy table first
      const legacyResult = await conn.execute<any>(
        `DELETE FROM group_members WHERE group_id = :groupId AND user_id = :userId`,
        { groupId: id, userId: memberId }
      );
      if (legacyResult.rowsAffected && legacyResult.rowsAffected > 0) return { ok: true };

      // Try new table
      const newResult = await conn.execute<any>(
        `DELETE FROM group_participants WHERE group_id = :groupId AND member_id = :memberId`,
        { groupId: id, memberId }
      );
      if (newResult.rowsAffected && newResult.rowsAffected > 0) return { ok: true };

      return reply.code(404).send({ error: "Miembro no encontrado en el grupo" });
    });
  });
}
