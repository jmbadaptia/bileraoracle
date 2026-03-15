import { FastifyInstance } from "fastify";
import crypto from "crypto";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export async function spaceRoutes(app: FastifyInstance) {
  // ─── Spaces ───

  // GET /api/spaces
  app.get("/api/spaces", { preHandler: [requireAuth] }, async (request) => {
    const { search, active } = request.query as { search?: string; active?: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const conditions: string[] = [];
      const binds: Record<string, any> = {};

      if (active !== undefined && active !== "") {
        conditions.push("s.active = :active");
        binds.active = parseInt(active);
      }
      if (search) {
        conditions.push("(LOWER(s.name) LIKE :search OR LOWER(s.location) LIKE :search)");
        binds.search = `%${search.toLowerCase()}%`;
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const result = await conn.execute<any>(
        `SELECT s.id, s.name, s.description, s.capacity, s.location, s.color, s.active,
                s.created_at, u.name AS creator_name,
                (SELECT COUNT(*) FROM bookings b WHERE b.space_id = s.id AND b.end_date > SYSTIMESTAMP) AS upcoming_count
         FROM spaces s
         LEFT JOIN users u ON u.id = s.created_by
         ${where}
         ORDER BY s.name`,
        binds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        spaces: (result.rows || []).map((r: any) => ({
          id: r.ID,
          name: r.NAME,
          description: r.DESCRIPTION,
          capacity: r.CAPACITY,
          location: r.LOCATION,
          color: r.COLOR,
          active: r.ACTIVE === 1,
          createdAt: r.CREATED_AT,
          creatorName: r.CREATOR_NAME,
          upcomingCount: r.UPCOMING_COUNT,
        })),
      };
    });
  });

  // POST /api/spaces
  app.post("/api/spaces", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { name, description, capacity, location, color } = request.body as {
      name: string; description?: string; capacity?: number; location?: string; color?: string;
    };

    if (!name?.trim()) return reply.code(400).send({ error: "El nombre es obligatorio" });

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const id = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO spaces (id, tenant_id, name, description, capacity, location, color, created_by)
         VALUES (:id, :tenantId, :name, :description, :capacity, :location, :color, :createdBy)`,
        {
          id,
          tenantId: request.user.tenantId,
          name: name.trim(),
          description: description?.trim() || null,
          capacity: capacity || null,
          location: location?.trim() || null,
          color: color || "#3b82f6",
          createdBy: request.user.id,
        }
      );
      return reply.code(201).send({ id, name });
    });
  });

  // GET /api/spaces/:id
  app.get("/api/spaces/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT s.id, s.name, s.description, s.capacity, s.location, s.color, s.active,
                s.created_at, s.updated_at, u.name AS creator_name
         FROM spaces s
         LEFT JOIN users u ON u.id = s.created_by
         WHERE s.id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!result.rows || result.rows.length === 0) {
        return reply.code(404).send({ error: "Espacio no encontrado" });
      }

      const s = result.rows[0];

      // Upcoming bookings
      const bookingsResult = await conn.execute<any>(
        `SELECT b.id, b.title, b.start_date, b.end_date, b.notes,
                b.activity_id, u.name AS booked_by_name
         FROM bookings b
         LEFT JOIN users u ON u.id = b.booked_by
         WHERE b.space_id = :spaceId AND b.end_date > SYSTIMESTAMP
         ORDER BY b.start_date`,
        { spaceId: id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        id: s.ID,
        name: s.NAME,
        description: s.DESCRIPTION,
        capacity: s.CAPACITY,
        location: s.LOCATION,
        color: s.COLOR,
        active: s.ACTIVE === 1,
        createdAt: s.CREATED_AT,
        updatedAt: s.UPDATED_AT,
        creatorName: s.CREATOR_NAME,
        bookings: (bookingsResult.rows || []).map((b: any) => ({
          id: b.ID,
          title: b.TITLE,
          startDate: b.START_DATE,
          endDate: b.END_DATE,
          notes: b.NOTES,
          activityId: b.ACTIVITY_ID,
          bookedByName: b.BOOKED_BY_NAME,
        })),
      };
    });
  });

  // PUT /api/spaces/:id
  app.put("/api/spaces/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, description, capacity, location, color, active } = request.body as {
      name: string; description?: string; capacity?: number; location?: string; color?: string; active?: boolean;
    };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute(
        `UPDATE spaces SET name = :name, description = :description, capacity = :capacity,
                location = :location, color = :color, active = :active, updated_at = SYSTIMESTAMP
         WHERE id = :id`,
        {
          id,
          name: name.trim(),
          description: description?.trim() || null,
          capacity: capacity || null,
          location: location?.trim() || null,
          color: color || "#3b82f6",
          active: active === false ? 0 : 1,
        }
      );
      if (result.rowsAffected === 0) return reply.code(404).send({ error: "Espacio no encontrado" });
      return { id, name };
    });
  });

  // DELETE /api/spaces/:id
  app.delete("/api/spaces/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute(`DELETE FROM spaces WHERE id = :id`, { id });
      if (result.rowsAffected === 0) return reply.code(404).send({ error: "Espacio no encontrado" });
      return { ok: true };
    });
  });

  // ─── Bookings ───

  // GET /api/bookings
  app.get("/api/bookings", { preHandler: [requireAuth] }, async (request) => {
    const { spaceId, from, to, limit } = request.query as {
      spaceId?: string; from?: string; to?: string; limit?: string;
    };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const conditions: string[] = [];
      const binds: Record<string, any> = {};

      if (spaceId) {
        conditions.push("b.space_id = :spaceId");
        binds.spaceId = spaceId;
      }
      if (from) {
        conditions.push("b.end_date > TO_TIMESTAMP(:fromDate, 'YYYY-MM-DD')");
        binds.fromDate = from;
      }
      if (to) {
        conditions.push("b.start_date < TO_TIMESTAMP(:toDate, 'YYYY-MM-DD') + 1");
        binds.toDate = to;
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const limitNum = Math.min(parseInt(limit || "500"), 1000);

      const result = await conn.execute<any>(
        `SELECT b.id, b.title, b.start_date, b.end_date, b.notes,
                b.space_id, s.name AS space_name, s.color AS space_color,
                b.activity_id, b.booked_by, u.name AS booked_by_name
         FROM bookings b
         JOIN spaces s ON s.id = b.space_id
         LEFT JOIN users u ON u.id = b.booked_by
         ${where}
         ORDER BY b.start_date
         FETCH FIRST :limitNum ROWS ONLY`,
        { ...binds, limitNum },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        bookings: (result.rows || []).map((b: any) => ({
          id: b.ID,
          title: b.TITLE,
          startDate: b.START_DATE,
          endDate: b.END_DATE,
          notes: b.NOTES,
          spaceId: b.SPACE_ID,
          spaceName: b.SPACE_NAME,
          spaceColor: b.SPACE_COLOR,
          activityId: b.ACTIVITY_ID,
          bookedBy: b.BOOKED_BY,
          bookedByName: b.BOOKED_BY_NAME,
        })),
      };
    });
  });

  // POST /api/bookings
  app.post("/api/bookings", { preHandler: [requireAuth] }, async (request, reply) => {
    const { spaceId, title, startDate, endDate, notes, activityId } = request.body as {
      spaceId: string; title: string; startDate: string; endDate: string;
      notes?: string; activityId?: string;
    };

    if (!spaceId || !title?.trim() || !startDate || !endDate) {
      return reply.code(400).send({ error: "Espacio, título, fecha inicio y fecha fin son obligatorios" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Check overlap
      const overlap = await conn.execute<any>(
        `SELECT COUNT(*) AS cnt FROM bookings
         WHERE space_id = :spaceId
           AND start_date < TO_TIMESTAMP(:endDate, 'YYYY-MM-DD"T"HH24:MI')
           AND end_date > TO_TIMESTAMP(:startDate, 'YYYY-MM-DD"T"HH24:MI')`,
        { spaceId, startDate, endDate },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (overlap.rows?.[0]?.CNT > 0) {
        return reply.code(409).send({ error: "Ya existe una reserva en ese horario para este espacio" });
      }

      const id = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO bookings (id, tenant_id, space_id, title, start_date, end_date, notes, activity_id, booked_by)
         VALUES (:id, :tenantId, :spaceId, :title,
                 TO_TIMESTAMP(:startDate, 'YYYY-MM-DD"T"HH24:MI'),
                 TO_TIMESTAMP(:endDate, 'YYYY-MM-DD"T"HH24:MI'),
                 :notes, :activityId, :bookedBy)`,
        {
          id,
          tenantId: request.user.tenantId,
          spaceId,
          title: title.trim(),
          startDate,
          endDate,
          notes: notes?.trim() || null,
          activityId: activityId || null,
          bookedBy: request.user.id,
        }
      );

      return reply.code(201).send({ id, title });
    });
  });

  // PUT /api/bookings/:id
  app.put("/api/bookings/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { spaceId, title, startDate, endDate, notes, activityId } = request.body as {
      spaceId: string; title: string; startDate: string; endDate: string;
      notes?: string; activityId?: string;
    };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Check exists and authorization
      const existing = await conn.execute<any>(
        `SELECT booked_by FROM bookings WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!existing.rows?.length) return reply.code(404).send({ error: "Reserva no encontrada" });

      if (existing.rows[0].BOOKED_BY !== request.user.id && request.user.role !== "ADMIN") {
        return reply.code(403).send({ error: "No tienes permiso para editar esta reserva" });
      }

      // Check overlap (excluding self)
      const overlap = await conn.execute<any>(
        `SELECT COUNT(*) AS cnt FROM bookings
         WHERE space_id = :spaceId AND id != :id
           AND start_date < TO_TIMESTAMP(:endDate, 'YYYY-MM-DD"T"HH24:MI')
           AND end_date > TO_TIMESTAMP(:startDate, 'YYYY-MM-DD"T"HH24:MI')`,
        { spaceId, id, startDate, endDate },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (overlap.rows?.[0]?.CNT > 0) {
        return reply.code(409).send({ error: "Ya existe una reserva en ese horario para este espacio" });
      }

      await conn.execute(
        `UPDATE bookings SET space_id = :spaceId, title = :title,
                start_date = TO_TIMESTAMP(:startDate, 'YYYY-MM-DD"T"HH24:MI'),
                end_date = TO_TIMESTAMP(:endDate, 'YYYY-MM-DD"T"HH24:MI'),
                notes = :notes, activity_id = :activityId, updated_at = SYSTIMESTAMP
         WHERE id = :id`,
        {
          id, spaceId, title: title.trim(), startDate, endDate,
          notes: notes?.trim() || null, activityId: activityId || null,
        }
      );

      return { id, title };
    });
  });

  // DELETE /api/bookings/:id
  app.delete("/api/bookings/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const existing = await conn.execute<any>(
        `SELECT booked_by FROM bookings WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!existing.rows?.length) return reply.code(404).send({ error: "Reserva no encontrada" });

      if (existing.rows[0].BOOKED_BY !== request.user.id && request.user.role !== "ADMIN") {
        return reply.code(403).send({ error: "No tienes permiso para eliminar esta reserva" });
      }

      await conn.execute(`DELETE FROM bookings WHERE id = :id`, { id });
      return { ok: true };
    });
  });
}
