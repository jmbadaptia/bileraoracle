import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export async function memberRoutes(app: FastifyInstance) {
  // GET /api/members — list members of current tenant
  app.get("/api/members", { preHandler: [requireAuth] }, async (request) => {
    const { search, active, page, limit } = request.query as {
      search?: string;
      active?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page || "1");
    const limitNum = parseInt(limit || "20");
    const offset = (pageNum - 1) * limitNum;

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      let whereClause = "WHERE 1=1";
      const countBinds: any = {};
      const listBinds: any = { limitNum, offset };

      if (search) {
        whereClause += " AND (UPPER(u.name) LIKE UPPER(:search) OR UPPER(u.email) LIKE UPPER(:search))";
        countBinds.search = `%${search}%`;
        listBinds.search = `%${search}%`;
      }

      if (active !== undefined) {
        whereClause += " AND u.active = :active";
        const activeVal = active === "true" ? 1 : 0;
        countBinds.active = activeVal;
        listBinds.active = activeVal;
      }

      const countResult = await conn.execute<any>(
        `SELECT COUNT(*) AS total
         FROM memberships m
         JOIN users u ON u.id = m.user_id
         ${whereClause}`,
        countBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const total = countResult.rows?.[0]?.TOTAL || 0;

      const result = await conn.execute<any>(
        `SELECT u.id, u.name, u.email, u.avatar_path, u.phone, u.bio, u.active, u.created_at,
                m.role,
                (SELECT COUNT(*) FROM activities a WHERE a.owner_id = u.id) AS activities_count
         FROM memberships m
         JOIN users u ON u.id = m.user_id
         ${whereClause}
         ORDER BY u.name
         OFFSET :offset ROWS FETCH NEXT :limitNum ROWS ONLY`,
        listBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        members: (result.rows || []).map((row: any) => ({
          id: row.ID,
          name: row.NAME,
          email: row.EMAIL,
          avatarPath: row.AVATAR_PATH,
          phone: row.PHONE,
          bio: row.BIO,
          active: !!row.ACTIVE,
          role: row.ROLE,
          activitiesCount: row.ACTIVITIES_COUNT,
          createdAt: row.CREATED_AT,
        })),
        total,
        page: pageNum,
        limit: limitNum,
      };
    });
  });

  // GET /api/members/:id — member detail with recent activities
  app.get("/api/members/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT u.id, u.name, u.email, u.avatar_path, u.phone, u.bio, u.active, u.created_at,
                m.role
         FROM memberships m
         JOIN users u ON u.id = m.user_id
         WHERE u.id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const member = result.rows?.[0];
      if (!member) {
        return reply.code(404).send({ error: "Miembro no encontrado" });
      }

      // Recent owned activities
      const ownedResult = await conn.execute<any>(
        `SELECT id, title, type, status, start_date, created_at
         FROM activities
         WHERE owner_id = :id
         ORDER BY created_at DESC
         FETCH FIRST 10 ROWS ONLY`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Recent attended activities
      const attendedResult = await conn.execute<any>(
        `SELECT a.id, a.title, a.type, a.status, a.start_date, a.created_at
         FROM activity_attendees aa
         JOIN activities a ON a.id = aa.activity_id
         WHERE aa.user_id = :id
         ORDER BY a.created_at DESC
         FETCH FIRST 10 ROWS ONLY`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const mapActivity = (row: any) => ({
        id: row.ID,
        title: row.TITLE,
        type: row.TYPE,
        status: row.STATUS,
        startDate: row.START_DATE,
        createdAt: row.CREATED_AT,
      });

      return {
        id: member.ID,
        name: member.NAME,
        email: member.EMAIL,
        avatarPath: member.AVATAR_PATH,
        phone: member.PHONE,
        bio: member.BIO,
        active: !!member.ACTIVE,
        role: member.ROLE,
        createdAt: member.CREATED_AT,
        activitiesOwned: (ownedResult.rows || []).map(mapActivity),
        activitiesAttended: (attendedResult.rows || []).map(mapActivity),
      };
    });
  });

  // POST /api/members — create user + membership in current tenant
  app.post("/api/members", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { name, email, password, role, phone, bio } = request.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      phone?: string;
      bio?: string;
    };

    if (!name || !email) {
      return reply.code(400).send({ error: "Nombre y email son obligatorios" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Check if user already exists
      const existing = await conn.execute<any>(
        `SELECT id FROM users WHERE email = :email`,
        { email: email.toLowerCase() },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      let userId: string;

      if (existing.rows?.length) {
        // User exists — check if already member of this tenant
        userId = existing.rows[0].ID;
        const memberCheck = await conn.execute<any>(
          `SELECT id FROM memberships WHERE user_id = :userId`,
          { userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (memberCheck.rows?.length) {
          return reply.code(409).send({ error: "El usuario ya es miembro de esta organización" });
        }
      } else {
        // Create new user
        userId = crypto.randomUUID();
        const passwordHash = await bcrypt.hash(password || crypto.randomUUID(), 12);

        await conn.execute(
          `INSERT INTO users (id, email, password_hash, name, phone, bio, active)
           VALUES (:id, :email, :passwordHash, :name, :phone, :bio, 1)`,
          {
            id: userId,
            email: email.toLowerCase(),
            passwordHash,
            name: name.trim(),
            phone: phone || null,
            bio: bio || null,
          }
        );
      }

      // Create membership
      const membershipId = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO memberships (id, tenant_id, user_id, role)
         VALUES (:id, :tenantId, :userId, :role)`,
        {
          id: membershipId,
          tenantId: request.user.tenantId,
          userId,
          role: role === "ADMIN" ? "ADMIN" : "MEMBER",
        }
      );

      return reply.code(201).send({
        id: userId,
        name: name.trim(),
        email: email.toLowerCase(),
        role: role === "ADMIN" ? "ADMIN" : "MEMBER",
        active: true,
      });
    });
  });

  // PUT /api/members/:id — update member profile
  app.put("/api/members/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, email, password, role, phone, bio } = request.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      phone?: string;
      bio?: string;
    };

    if (!name || !email) {
      return reply.code(400).send({ error: "Nombre y email son obligatorios" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Verify membership exists in this tenant
      const memberCheck = await conn.execute<any>(
        `SELECT id FROM memberships WHERE user_id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!memberCheck.rows?.length) {
        return reply.code(404).send({ error: "Miembro no encontrado" });
      }

      // Update user fields
      let updateSql = `UPDATE users SET name = :name, email = :email, phone = :phone, bio = :bio, updated_at = SYSTIMESTAMP`;
      const binds: any = {
        id,
        name: name.trim(),
        email: email.toLowerCase(),
        phone: phone || null,
        bio: bio || null,
      };

      if (password && password.length > 0) {
        updateSql += `, password_hash = :passwordHash`;
        binds.passwordHash = await bcrypt.hash(password, 12);
      }

      updateSql += ` WHERE id = :id`;
      await conn.execute(updateSql, binds);

      // Update role if provided
      if (role) {
        await conn.execute(
          `UPDATE memberships SET role = :role WHERE user_id = :id`,
          { role: role === "ADMIN" ? "ADMIN" : "MEMBER", id }
        );
      }

      return {
        id,
        name: name.trim(),
        email: email.toLowerCase(),
        role: role === "ADMIN" ? "ADMIN" : "MEMBER",
        phone: phone || null,
        bio: bio || null,
      };
    });
  });

  // DELETE /api/members/:id — deactivate member
  app.delete("/api/members/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    if (id === request.user.id) {
      return reply.code(400).send({ error: "No puedes desactivar tu propia cuenta" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Verify membership
      const memberCheck = await conn.execute<any>(
        `SELECT id FROM memberships WHERE user_id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!memberCheck.rows?.length) {
        return reply.code(404).send({ error: "Miembro no encontrado" });
      }

      await conn.execute(
        `UPDATE users SET active = 0, updated_at = SYSTIMESTAMP WHERE id = :id`,
        { id }
      );

      return { ok: true };
    });
  });
}
