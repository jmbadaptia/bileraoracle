import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

export async function searchRoutes(app: FastifyInstance) {
  // GET /api/search?q=...&type=...&limit=...
  app.get("/api/search", { preHandler: [requireAuth] }, async (request, reply) => {
    const { q, type, limit } = request.query as {
      q?: string;
      type?: string; // activities, documents, albums, members, or all
      limit?: string;
    };

    if (!q || q.trim().length < 2) {
      return reply.code(400).send({ error: "La búsqueda debe tener al menos 2 caracteres" });
    }

    const searchLimit = Math.min(parseInt(limit || "10"), 50);
    const searchTerm = `%${q.trim()}%`;
    const searchType = type || "all";

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const results: any = {};

      if (searchType === "all" || searchType === "activities") {
        const actResult = await conn.execute<any>(
          `SELECT id, title, type, status, start_date, created_at
           FROM activities
           WHERE UPPER(title) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search)
           ORDER BY created_at DESC
           FETCH FIRST :lim ROWS ONLY`,
          { search: searchTerm, lim: searchLimit },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        results.activities = (actResult.rows || []).map((row: any) => ({
          id: row.ID,
          title: row.TITLE,
          type: row.TYPE,
          status: row.STATUS,
          startDate: row.START_DATE,
          createdAt: row.CREATED_AT,
        }));
      }

      if (searchType === "all" || searchType === "documents") {
        const docResult = await conn.execute<any>(
          `SELECT id, title, file_name, file_type, status, created_at
           FROM documents
           WHERE UPPER(title) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search)
           ORDER BY created_at DESC
           FETCH FIRST :lim ROWS ONLY`,
          { search: searchTerm, lim: searchLimit },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        results.documents = (docResult.rows || []).map((row: any) => ({
          id: row.ID,
          title: row.TITLE,
          fileName: row.FILE_NAME,
          fileType: row.FILE_TYPE,
          status: row.STATUS,
          createdAt: row.CREATED_AT,
        }));
      }

      if (searchType === "all" || searchType === "albums") {
        const albumResult = await conn.execute<any>(
          `SELECT id, title, visibility, created_at
           FROM albums
           WHERE UPPER(title) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search)
           ORDER BY created_at DESC
           FETCH FIRST :lim ROWS ONLY`,
          { search: searchTerm, lim: searchLimit },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        results.albums = (albumResult.rows || []).map((row: any) => ({
          id: row.ID,
          title: row.TITLE,
          visibility: row.VISIBILITY,
          createdAt: row.CREATED_AT,
        }));
      }

      if (searchType === "all" || searchType === "members") {
        const memberResult = await conn.execute<any>(
          `SELECT u.id, u.name, u.email, m.role
           FROM memberships m JOIN users u ON u.id = m.user_id
           WHERE UPPER(u.name) LIKE UPPER(:search) OR UPPER(u.email) LIKE UPPER(:search)
           ORDER BY u.name
           FETCH FIRST :lim ROWS ONLY`,
          { search: searchTerm, lim: searchLimit },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        results.members = (memberResult.rows || []).map((row: any) => ({
          id: row.ID,
          name: row.NAME,
          email: row.EMAIL,
          role: row.ROLE,
        }));
      }

      return results;
    });
  });
}
