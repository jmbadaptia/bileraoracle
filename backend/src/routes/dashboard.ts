import { FastifyInstance } from "fastify";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /api/dashboard/stats
  app.get("/api/dashboard/stats", { preHandler: [requireAuth] }, async (request) => {
    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const stats = await conn.execute<any>(
        `SELECT
           (SELECT COUNT(*) FROM memberships m JOIN users u ON u.id = m.user_id WHERE u.active = 1) AS total_members,
           (SELECT COUNT(*) FROM activities WHERE start_date >= TRUNC(SYSDATE, 'MM')) AS activities_this_month,
           (SELECT COUNT(*) FROM documents) AS total_documents,
           (SELECT COUNT(*) FROM albums) AS total_albums
         FROM DUAL`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const s = stats.rows?.[0] || {};

      const recentActivities = await conn.execute<any>(
        `SELECT a.id, a.title, a.type, a.status, a.start_date, u.name AS owner_name
         FROM activities a LEFT JOIN users u ON u.id = a.owner_id
         ORDER BY a.created_at DESC FETCH FIRST 5 ROWS ONLY`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const recentDocuments = await conn.execute<any>(
        `SELECT d.id, d.title, d.file_name, d.file_type, d.created_at, u.name AS uploader_name
         FROM documents d LEFT JOIN users u ON u.id = d.uploaded_by
         ORDER BY d.created_at DESC FETCH FIRST 5 ROWS ONLY`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const upcomingActivities = await conn.execute<any>(
        `SELECT a.id, a.title, a.type, a.status, a.start_date, u.name AS owner_name
         FROM activities a LEFT JOIN users u ON u.id = a.owner_id
         WHERE a.start_date >= SYSTIMESTAMP
         ORDER BY a.start_date ASC FETCH FIRST 5 ROWS ONLY`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const mapActivity = (row: any) => ({
        id: row.ID,
        title: row.TITLE,
        type: row.TYPE,
        status: row.STATUS,
        startDate: row.START_DATE,
        ownerName: row.OWNER_NAME,
      });

      return {
        totalMembers: s.TOTAL_MEMBERS || 0,
        activitiesThisMonth: s.ACTIVITIES_THIS_MONTH || 0,
        totalDocuments: s.TOTAL_DOCUMENTS || 0,
        totalAlbums: s.TOTAL_ALBUMS || 0,
        recentActivities: (recentActivities.rows || []).map(mapActivity),
        recentDocuments: (recentDocuments.rows || []).map((row: any) => ({
          id: row.ID,
          title: row.TITLE,
          fileName: row.FILE_NAME,
          fileType: row.FILE_TYPE,
          createdAt: row.CREATED_AT,
          uploaderName: row.UPLOADER_NAME,
        })),
        upcomingActivities: (upcomingActivities.rows || []).map(mapActivity),
      };
    });
  });

  // GET /api/admin/stats
  app.get("/api/admin/stats", { preHandler: [requireAdmin] }, async (request) => {
    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT
           (SELECT COUNT(*) FROM memberships) AS total_members,
           (SELECT COUNT(*) FROM documents) AS total_documents,
           (SELECT COUNT(*) FROM activities) AS total_activities,
           (SELECT COUNT(*) FROM albums) AS total_albums
         FROM DUAL`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const s = result.rows?.[0] || {};
      return {
        totalMembers: s.TOTAL_MEMBERS || 0,
        totalDocuments: s.TOTAL_DOCUMENTS || 0,
        totalActivities: s.TOTAL_ACTIVITIES || 0,
        totalAlbums: s.TOTAL_ALBUMS || 0,
      };
    });
  });

  // GET /api/admin/theme
  app.get("/api/admin/theme", { preHandler: [requireAuth] }, async (request) => {
    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT theme FROM tenants WHERE id = :tenantId`,
        { tenantId: request.user.tenantId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return { theme: result.rows?.[0]?.THEME || "default" };
    });
  });

  // PUT /api/admin/theme
  app.put("/api/admin/theme", { preHandler: [requireAdmin] }, async (request) => {
    const { theme } = request.body as { theme: string };
    const validThemes = ["default", "blue", "green", "violet", "rose", "teal"];
    if (!validThemes.includes(theme)) {
      return { error: "Tema no válido" };
    }
    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await conn.execute(
        `UPDATE tenants SET theme = :theme, updated_at = SYSTIMESTAMP WHERE id = :tenantId`,
        { theme, tenantId: request.user.tenantId }
      );
      await conn.commit();
      return { ok: true, theme };
    });
  });

  // POST /api/admin/logo — upload logo
  const LOGO_PATH = path.join(UPLOAD_DIR, "logo.png");
  const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
  const MAX_LOGO_SIZE = 2 * 1024 * 1024;

  app.post("/api/admin/logo", { preHandler: [requireAdmin] }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "No se envió ningún archivo" });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return reply.code(400).send({ error: "Tipo de archivo no permitido. Use PNG, JPG, SVG o WebP." });
    }

    const buffer = await file.toBuffer();
    if (buffer.length > MAX_LOGO_SIZE) {
      return reply.code(400).send({ error: "El archivo excede el tamaño máximo de 2MB" });
    }

    const dir = path.dirname(LOGO_PATH);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(LOGO_PATH, buffer);
    return { ok: true };
  });

  // GET /api/admin/logo — serve logo (public)
  app.get("/api/admin/logo", async (_request, reply) => {
    if (!existsSync(LOGO_PATH)) {
      return reply.code(404).send({ error: "No hay logo configurado" });
    }

    const buffer = await readFile(LOGO_PATH);
    return reply.type("image/png").send(buffer);
  });
}
