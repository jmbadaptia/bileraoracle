import { FastifyInstance } from "fastify";
import crypto from "crypto";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export async function socioRoutes(app: FastifyInstance) {
  // GET /api/socios
  app.get("/api/socios", { preHandler: [requireAuth] }, async (request) => {
    const { q, estado, page, limit } = request.query as {
      q?: string;
      estado?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page || "1");
    const limitNum = parseInt(limit || "200");
    const offset = (pageNum - 1) * limitNum;

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      let whereClause = "WHERE 1=1";
      const countBinds: any = {};
      const listBinds: any = { limitNum, offset };

      if (q) {
        whereClause += " AND (LOWER(nombre) LIKE LOWER(:q) OR LOWER(apellidos) LIKE LOWER(:q) OR LOWER(email) LIKE LOWER(:q) OR LOWER(dni) LIKE LOWER(:q) OR LOWER(numero_socio) LIKE LOWER(:q))";
        countBinds.q = `%${q}%`;
        listBinds.q = `%${q}%`;
      }

      if (estado) {
        whereClause += " AND estado = :estado";
        countBinds.estado = estado;
        listBinds.estado = estado;
      }

      const countResult = await conn.execute<any>(
        `SELECT COUNT(*) AS total FROM socios ${whereClause}`,
        countBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const total = countResult.rows?.[0]?.TOTAL || 0;

      const result = await conn.execute<any>(
        `SELECT id, nombre, apellidos, dni, email, telefono, direccion,
                numero_socio, fecha_alta, fecha_baja, estado, notas,
                created_by, created_at, updated_at
         FROM socios
         ${whereClause}
         ORDER BY apellidos, nombre
         OFFSET :offset ROWS FETCH NEXT :limitNum ROWS ONLY`,
        listBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        socios: (result.rows || []).map((r: any) => ({
          id: r.ID,
          nombre: r.NOMBRE,
          apellidos: r.APELLIDOS,
          dni: r.DNI,
          email: r.EMAIL,
          telefono: r.TELEFONO,
          direccion: r.DIRECCION,
          numeroSocio: r.NUMERO_SOCIO,
          fechaAlta: r.FECHA_ALTA,
          fechaBaja: r.FECHA_BAJA,
          estado: r.ESTADO,
          notas: r.NOTAS,
          createdBy: r.CREATED_BY,
          createdAt: r.CREATED_AT,
          updatedAt: r.UPDATED_AT,
        })),
        total,
        page: pageNum,
        limit: limitNum,
      };
    });
  });

  // GET /api/socios/:id
  app.get("/api/socios/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT s.*, u.name AS creator_name FROM socios s LEFT JOIN users u ON u.id = s.created_by WHERE s.id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const r = result.rows?.[0];
      if (!r) return reply.code(404).send({ error: "Socio no encontrado" });

      return {
        id: r.ID,
        nombre: r.NOMBRE,
        apellidos: r.APELLIDOS,
        dni: r.DNI,
        email: r.EMAIL,
        telefono: r.TELEFONO,
        direccion: r.DIRECCION,
        numeroSocio: r.NUMERO_SOCIO,
        fechaAlta: r.FECHA_ALTA,
        fechaBaja: r.FECHA_BAJA,
        estado: r.ESTADO,
        notas: r.NOTAS,
        createdBy: r.CREATED_BY,
        creatorName: r.CREATOR_NAME,
        createdAt: r.CREATED_AT,
        updatedAt: r.UPDATED_AT,
      };
    });
  });

  // POST /api/socios
  app.post("/api/socios", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { nombre, apellidos, dni, email, telefono, direccion, numeroSocio, fechaAlta, notas } =
      request.body as Record<string, any>;

    if (!nombre?.trim()) return reply.code(400).send({ error: "El nombre es obligatorio" });

    const id = crypto.randomUUID();

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await conn.execute(
        `INSERT INTO socios (id, tenant_id, nombre, apellidos, dni, email, telefono, direccion, numero_socio, fecha_alta, notas, created_by)
         VALUES (:id, :tenantId, :nombre, :apellidos, :dni, :email, :telefono, :direccion, :numeroSocio, :fechaAlta, :notas, :createdBy)`,
        {
          id,
          tenantId: request.user.tenantId,
          nombre: nombre.trim(),
          apellidos: apellidos?.trim() || null,
          dni: dni?.trim() || null,
          email: email?.trim()?.toLowerCase() || null,
          telefono: telefono?.trim() || null,
          direccion: direccion?.trim() || null,
          numeroSocio: numeroSocio?.trim() || null,
          fechaAlta: fechaAlta ? new Date(fechaAlta) : new Date(),
          notas: notas?.trim() || null,
          createdBy: request.user.id,
        }
      );

      return reply.code(201).send({ id, nombre: nombre.trim() });
    });
  });

  // PUT /api/socios/:id
  app.put("/api/socios/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { nombre, apellidos, dni, email, telefono, direccion, numeroSocio, fechaAlta, fechaBaja, estado, notas } =
      request.body as Record<string, any>;

    if (!nombre?.trim()) return reply.code(400).send({ error: "El nombre es obligatorio" });

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await conn.execute(
        `UPDATE socios SET nombre = :nombre, apellidos = :apellidos, dni = :dni, email = :email,
                telefono = :telefono, direccion = :direccion, numero_socio = :numeroSocio,
                fecha_alta = :fechaAlta, fecha_baja = :fechaBaja, estado = :estado,
                notas = :notas, updated_at = SYSTIMESTAMP
         WHERE id = :id`,
        {
          id,
          nombre: nombre.trim(),
          apellidos: apellidos?.trim() || null,
          dni: dni?.trim() || null,
          email: email?.trim()?.toLowerCase() || null,
          telefono: telefono?.trim() || null,
          direccion: direccion?.trim() || null,
          numeroSocio: numeroSocio?.trim() || null,
          fechaAlta: fechaAlta ? new Date(fechaAlta) : null,
          fechaBaja: fechaBaja ? new Date(fechaBaja) : null,
          estado: estado || "ACTIVO",
          notas: notas?.trim() || null,
        }
      );

      return { ok: true };
    });
  });

  // DELETE /api/socios/:id
  app.delete("/api/socios/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id FROM socios WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!result.rows?.length) return reply.code(404).send({ error: "Socio no encontrado" });

      await conn.execute(`DELETE FROM socios WHERE id = :id`, { id });
      return { ok: true };
    });
  });
}
