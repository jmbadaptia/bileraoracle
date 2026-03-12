import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

export async function contactRoutes(app: FastifyInstance) {
  // GET /api/contacts
  app.get("/api/contacts", { preHandler: [requireAuth] }, async (request) => {
    const { q, category, page, limit } = request.query as {
      q?: string;
      category?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page || "1");
    const limitNum = parseInt(limit || "50");
    const offset = (pageNum - 1) * limitNum;

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      let whereClause = "WHERE 1=1";
      const countBinds: any = {};
      const listBinds: any = { limitNum, offset };

      if (q) {
        whereClause += " AND (LOWER(name) LIKE :q OR LOWER(email) LIKE :q OR LOWER(phone) LIKE :q)";
        countBinds.q = `%${q.toLowerCase()}%`;
        listBinds.q = `%${q.toLowerCase()}%`;
      }

      if (category) {
        whereClause += " AND category = :category";
        countBinds.category = category;
        listBinds.category = category;
      }

      const countResult = await conn.execute<any>(
        `SELECT COUNT(*) AS total FROM contacts ${whereClause}`,
        countBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const total = countResult.rows?.[0]?.TOTAL || 0;

      const result = await conn.execute<any>(
        `SELECT id, name, phone, email, web, category, notes, created_at, updated_at
         FROM contacts
         ${whereClause}
         ORDER BY name ASC
         OFFSET :offset ROWS FETCH NEXT :limitNum ROWS ONLY`,
        listBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        contacts: (result.rows || []).map((row: any) => ({
          id: row.ID,
          name: row.NAME,
          phone: row.PHONE,
          email: row.EMAIL,
          web: row.WEB,
          category: row.CATEGORY,
          notes: row.NOTES,
          createdAt: row.CREATED_AT,
          updatedAt: row.UPDATED_AT,
        })),
        total,
        page: pageNum,
        limit: limitNum,
      };
    });
  });

  // GET /api/contacts/categories — list distinct categories for filter
  app.get("/api/contacts/categories", { preHandler: [requireAuth] }, async (request) => {
    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT DISTINCT category FROM contacts WHERE category IS NOT NULL ORDER BY category`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (result.rows || []).map((r: any) => r.CATEGORY);
    });
  });

  // POST /api/contacts
  app.post("/api/contacts", { preHandler: [requireAuth] }, async (request, reply) => {
    const { name, phone, email, web, category, notes } = request.body as {
      name?: string;
      phone?: string;
      email?: string;
      web?: string;
      category?: string;
      notes?: string;
    };

    if (!name || name.trim().length === 0) {
      return reply.code(400).send({ error: "El nombre es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const id = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO contacts (id, tenant_id, name, phone, email, web, category, notes, created_by)
         VALUES (:id, :tenantId, :name, :phone, :email, :web, :category, :notes, :createdBy)`,
        {
          id,
          tenantId: request.user.tenantId,
          name: name.trim(),
          phone: phone || null,
          email: email || null,
          web: web || null,
          category: category || null,
          notes: notes || null,
          createdBy: request.user.id,
        }
      );

      return reply.code(201).send({ id, name: name.trim() });
    });
  });

  // GET /api/contacts/:id
  app.get("/api/contacts/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT c.id, c.name, c.phone, c.email, c.web, c.category, c.notes,
                c.created_by, c.created_at, c.updated_at,
                u.name AS created_by_name
         FROM contacts c
         LEFT JOIN users u ON u.id = c.created_by
         WHERE c.id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const contact = result.rows?.[0];
      if (!contact) {
        return reply.code(404).send({ error: "Contacto no encontrado" });
      }

      // Get linked activities
      const actResult = await conn.execute<any>(
        `SELECT a.id, a.title, a.type, a.status, a.start_date, ac.role
         FROM activity_contacts ac
         JOIN activities a ON a.id = ac.activity_id
         WHERE ac.contact_id = :id
         ORDER BY a.start_date DESC`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        id: contact.ID,
        name: contact.NAME,
        phone: contact.PHONE,
        email: contact.EMAIL,
        web: contact.WEB,
        category: contact.CATEGORY,
        notes: contact.NOTES,
        createdBy: contact.CREATED_BY,
        createdByName: contact.CREATED_BY_NAME,
        createdAt: contact.CREATED_AT,
        updatedAt: contact.UPDATED_AT,
        activities: (actResult.rows || []).map((a: any) => ({
          id: a.ID,
          title: a.TITLE,
          type: a.TYPE,
          status: a.STATUS,
          startDate: a.START_DATE,
          role: a.ROLE,
        })),
      };
    });
  });

  // PUT /api/contacts/:id
  app.put("/api/contacts/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, phone, email, web, category, notes } = request.body as {
      name?: string;
      phone?: string;
      email?: string;
      web?: string;
      category?: string;
      notes?: string;
    };

    if (!name || name.trim().length === 0) {
      return reply.code(400).send({ error: "El nombre es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id FROM contacts WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Contacto no encontrado" });
      }

      await conn.execute(
        `UPDATE contacts SET name = :name, phone = :phone, email = :email,
                web = :web, category = :category, notes = :notes,
                updated_at = SYSTIMESTAMP
         WHERE id = :id`,
        {
          id,
          name: name.trim(),
          phone: phone || null,
          email: email || null,
          web: web || null,
          category: category || null,
          notes: notes || null,
        }
      );

      return { id, name: name.trim() };
    });
  });

  // DELETE /api/contacts/:id
  app.delete("/api/contacts/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id, created_by FROM contacts WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Contacto no encontrado" });
      }

      const contact = check.rows[0];
      if (request.user.role !== "ADMIN" && contact.CREATED_BY !== request.user.id) {
        return reply.code(403).send({ error: "No autorizado" });
      }

      await conn.execute(`DELETE FROM contacts WHERE id = :id`, { id });
      return { ok: true };
    });
  });
}
