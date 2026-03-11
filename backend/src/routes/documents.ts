import { FastifyInstance } from "fastify";
import { existsSync } from "fs";
import { readFile, writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function documentRoutes(app: FastifyInstance) {
  // GET /api/documents
  app.get("/api/documents", { preHandler: [requireAuth] }, async (request) => {
    const { search, status, page, limit } = request.query as {
      search?: string;
      status?: string;
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
        whereClause += " AND (UPPER(d.title) LIKE UPPER(:search) OR UPPER(d.description) LIKE UPPER(:search))";
        countBinds.search = `%${search}%`;
        listBinds.search = `%${search}%`;
      }

      if (status) {
        whereClause += " AND d.status = :status";
        countBinds.status = status;
        listBinds.status = status;
      }

      const countResult = await conn.execute<any>(
        `SELECT COUNT(*) AS total FROM documents d ${whereClause}`,
        countBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const total = countResult.rows?.[0]?.TOTAL || 0;

      const result = await conn.execute<any>(
        `SELECT d.id, d.title, d.description, d.file_name, d.file_type, d.file_size,
                d.status, d.visibility, d.uploaded_by, d.created_at, d.updated_at,
                u.name AS uploader_name
         FROM documents d
         LEFT JOIN users u ON u.id = d.uploaded_by
         ${whereClause}
         ORDER BY d.created_at DESC
         OFFSET :offset ROWS FETCH NEXT :limitNum ROWS ONLY`,
        listBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        documents: (result.rows || []).map((row: any) => ({
          id: row.ID,
          title: row.TITLE,
          description: row.DESCRIPTION,
          fileName: row.FILE_NAME,
          fileType: row.FILE_TYPE,
          fileSize: row.FILE_SIZE,
          status: row.STATUS,
          visibility: row.VISIBILITY,
          uploadedBy: row.UPLOADED_BY,
          uploaderName: row.UPLOADER_NAME,
          createdAt: row.CREATED_AT,
          updatedAt: row.UPDATED_AT,
        })),
        total,
        page: pageNum,
        limit: limitNum,
      };
    });
  });

  // POST /api/documents (multipart upload)
  app.post("/api/documents", { preHandler: [requireAuth] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: "Archivo requerido" });
    }

    const buffer = await data.toBuffer();
    const fields = data.fields as Record<string, { value?: string }>;

    const title = fields.title?.value;
    const description = fields.description?.value || null;
    const visibility = fields.visibility?.value || "GENERAL";

    if (!title) {
      return reply.code(400).send({ error: "El título es obligatorio" });
    }

    const id = crypto.randomUUID();
    const ext = path.extname(data.filename);
    const safeFileName = `${id}${ext}`;
    const docsDir = path.join(UPLOAD_DIR, "documents");
    const filePath = path.join(docsDir, safeFileName);

    await mkdir(docsDir, { recursive: true });
    await writeFile(filePath, buffer);

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await conn.execute(
        `INSERT INTO documents (id, tenant_id, title, description, file_path, file_name, file_type, file_size, status, visibility, uploaded_by)
         VALUES (:id, :tenantId, :title, :description, :filePath, :fileName, :fileType, :fileSize, 'READY', :visibility, :uploadedBy)`,
        {
          id,
          tenantId: request.user.tenantId,
          title: title.trim(),
          description,
          filePath,
          fileName: data.filename,
          fileType: data.mimetype,
          fileSize: buffer.length,
          visibility,
          uploadedBy: request.user.id,
        }
      );

      return reply.code(201).send({
        id,
        title: title.trim(),
        fileName: data.filename,
        fileType: data.mimetype,
        fileSize: buffer.length,
        status: "READY",
      });
    });
  });

  // GET /api/documents/:id
  app.get("/api/documents/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT d.id, d.title, d.description, d.file_path, d.file_name, d.file_type,
                d.file_size, d.status, d.visibility, d.uploaded_by, d.created_at, d.updated_at,
                u.name AS uploader_name
         FROM documents d
         LEFT JOIN users u ON u.id = d.uploaded_by
         WHERE d.id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const doc = result.rows?.[0];
      if (!doc) {
        return reply.code(404).send({ error: "Documento no encontrado" });
      }

      // Get linked activities
      const actResult = await conn.execute<any>(
        `SELECT a.id, a.title, a.type, a.status
         FROM document_activities da JOIN activities a ON a.id = da.activity_id
         WHERE da.document_id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        id: doc.ID,
        title: doc.TITLE,
        description: doc.DESCRIPTION,
        fileName: doc.FILE_NAME,
        fileType: doc.FILE_TYPE,
        fileSize: doc.FILE_SIZE,
        status: doc.STATUS,
        visibility: doc.VISIBILITY,
        uploadedBy: doc.UPLOADED_BY,
        uploaderName: doc.UPLOADER_NAME,
        createdAt: doc.CREATED_AT,
        updatedAt: doc.UPDATED_AT,
        activities: (actResult.rows || []).map((a: any) => ({
          id: a.ID,
          title: a.TITLE,
          type: a.TYPE,
          status: a.STATUS,
        })),
      };
    });
  });

  // DELETE /api/documents/:id
  app.delete("/api/documents/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id, file_path FROM documents WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!result.rows?.length) {
        return reply.code(404).send({ error: "Documento no encontrado" });
      }

      const filePath = result.rows[0].FILE_PATH;

      await conn.execute(`DELETE FROM documents WHERE id = :id`, { id });

      // Clean up file
      try {
        await unlink(filePath);
      } catch {
        // File may not exist
      }

      return { ok: true };
    });
  });

  // GET /api/documents/:id/download
  app.get("/api/documents/:id/download", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT file_path, file_name, file_type FROM documents WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const doc = result.rows?.[0];
      if (!doc) {
        return reply.code(404).send({ error: "Documento no encontrado" });
      }

      if (!existsSync(doc.FILE_PATH)) {
        return reply.code(404).send({ error: "Archivo no encontrado en disco" });
      }

      const buffer = await readFile(doc.FILE_PATH);

      return reply
        .header("Content-Type", doc.FILE_TYPE || "application/octet-stream")
        .header("Content-Disposition", `attachment; filename="${doc.FILE_NAME}"`)
        .header("Content-Length", buffer.length.toString())
        .send(buffer);
    });
  });
}
