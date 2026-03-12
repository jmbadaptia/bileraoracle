import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getEmbedding } from "../lib/ai.js";

export async function searchRoutes(app: FastifyInstance) {
  // GET /api/search?q=...&type=...&limit=...&mode=...
  app.get("/api/search", { preHandler: [requireAuth] }, async (request, reply) => {
    const { q, type, limit, mode } = request.query as {
      q?: string;
      type?: string;
      limit?: string;
      mode?: string; // "text" | "semantic" | "hybrid" (default)
    };

    if (!q || q.trim().length < 2) {
      return reply.code(400).send({ error: "La búsqueda debe tener al menos 2 caracteres" });
    }

    const searchLimit = Math.min(parseInt(limit || "10"), 50);
    const searchTerm = `%${q.trim()}%`;
    const searchType = type || "all";
    const searchMode = mode || "hybrid";

    // Get query embedding for semantic/hybrid modes
    let queryEmbedding: Float32Array | null = null;
    if (searchMode !== "text") {
      const emb = await getEmbedding(q.trim());
      if (emb) {
        queryEmbedding = new Float32Array(emb);
      }
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const results: any = {};

      if (searchType === "all" || searchType === "activities") {
        if (queryEmbedding) {
          // Hybrid: vector similarity + text match bonus
          const actResult = await conn.execute<any>(
            `SELECT id, title, type, status, start_date, created_at,
                    VECTOR_DISTANCE(embedding, :qvec, COSINE) AS distance,
                    CASE WHEN UPPER(title) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search)
                         THEN 1 ELSE 0 END AS text_match
             FROM activities
             WHERE embedding IS NOT NULL
             ORDER BY (CASE WHEN UPPER(title) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search)
                            THEN 0.4 ELSE 0 END) + (1 - VECTOR_DISTANCE(embedding, :qvec, COSINE)) * 0.6 DESC
             FETCH FIRST :lim ROWS ONLY`,
            {
              qvec: { val: queryEmbedding, type: oracledb.DB_TYPE_VECTOR },
              search: searchTerm,
              lim: searchLimit,
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          results.activities = (actResult.rows || []).map((row: any) => ({
            id: row.ID,
            title: row.TITLE,
            type: row.TYPE,
            status: row.STATUS,
            startDate: row.START_DATE,
            createdAt: row.CREATED_AT,
            distance: row.DISTANCE,
            textMatch: row.TEXT_MATCH,
          }));
        } else {
          // Fallback: text-only search
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
      }

      if (searchType === "all" || searchType === "documents") {
        if (queryEmbedding) {
          // Hybrid: metadata search + chunk content vector search, deduplicated by document
          const docResult = await conn.execute<any>(
            `SELECT id, title, file_name, file_type, status, created_at,
                    VECTOR_DISTANCE(embedding, :qvec, COSINE) AS distance,
                    CASE WHEN UPPER(title) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search)
                         THEN 1 ELSE 0 END AS text_match
             FROM documents
             WHERE embedding IS NOT NULL
             ORDER BY (CASE WHEN UPPER(title) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search)
                            THEN 0.4 ELSE 0 END) + (1 - VECTOR_DISTANCE(embedding, :qvec, COSINE)) * 0.6 DESC
             FETCH FIRST :lim ROWS ONLY`,
            {
              qvec: { val: queryEmbedding, type: oracledb.DB_TYPE_VECTOR },
              search: searchTerm,
              lim: searchLimit,
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );

          // Also search chunk content vectors
          const chunkResult = await conn.execute<any>(
            `SELECT dc.document_id, d.title, d.file_name, d.file_type, d.status, d.created_at,
                    MIN(VECTOR_DISTANCE(dc.embedding, :qvec, COSINE)) AS distance,
                    SUBSTR(MIN(dc.content), 1, 200) AS snippet
             FROM document_chunks dc
             JOIN documents d ON d.id = dc.document_id
             WHERE dc.embedding IS NOT NULL
             GROUP BY dc.document_id, d.title, d.file_name, d.file_type, d.status, d.created_at
             ORDER BY MIN(VECTOR_DISTANCE(dc.embedding, :qvec, COSINE))
             FETCH FIRST :lim ROWS ONLY`,
            {
              qvec: { val: queryEmbedding, type: oracledb.DB_TYPE_VECTOR },
              lim: searchLimit,
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );

          // Merge and deduplicate by document ID
          const docMap = new Map<string, any>();
          for (const row of docResult.rows || []) {
            docMap.set(row.ID, {
              id: row.ID,
              title: row.TITLE,
              fileName: row.FILE_NAME,
              fileType: row.FILE_TYPE,
              status: row.STATUS,
              createdAt: row.CREATED_AT,
              distance: row.DISTANCE,
              textMatch: row.TEXT_MATCH,
            });
          }
          for (const row of chunkResult.rows || []) {
            const existing = docMap.get(row.DOCUMENT_ID);
            if (!existing || row.DISTANCE < existing.distance) {
              docMap.set(row.DOCUMENT_ID, {
                id: row.DOCUMENT_ID,
                title: row.TITLE,
                fileName: row.FILE_NAME,
                fileType: row.FILE_TYPE,
                status: row.STATUS,
                createdAt: row.CREATED_AT,
                distance: row.DISTANCE,
                snippet: row.SNIPPET,
                textMatch: existing?.textMatch || 0,
              });
            }
          }
          results.documents = [...docMap.values()]
            .sort((a, b) => a.distance - b.distance)
            .slice(0, searchLimit);
        } else {
          // Text-only: search metadata + extracted_text
          const docResult = await conn.execute<any>(
            `SELECT id, title, file_name, file_type, status, created_at
             FROM documents
             WHERE UPPER(title) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search)
                OR UPPER(extracted_text) LIKE UPPER(:search)
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
      }

      if (searchType === "all" || searchType === "albums") {
        if (queryEmbedding) {
          const albumResult = await conn.execute<any>(
            `SELECT id, title, visibility, created_at,
                    VECTOR_DISTANCE(embedding, :qvec, COSINE) AS distance,
                    CASE WHEN UPPER(title) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search)
                         THEN 1 ELSE 0 END AS text_match
             FROM albums
             WHERE embedding IS NOT NULL
             ORDER BY (CASE WHEN UPPER(title) LIKE UPPER(:search) OR UPPER(description) LIKE UPPER(:search)
                            THEN 0.4 ELSE 0 END) + (1 - VECTOR_DISTANCE(embedding, :qvec, COSINE)) * 0.6 DESC
             FETCH FIRST :lim ROWS ONLY`,
            {
              qvec: { val: queryEmbedding, type: oracledb.DB_TYPE_VECTOR },
              search: searchTerm,
              lim: searchLimit,
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          results.albums = (albumResult.rows || []).map((row: any) => ({
            id: row.ID,
            title: row.TITLE,
            visibility: row.VISIBILITY,
            createdAt: row.CREATED_AT,
            distance: row.DISTANCE,
            textMatch: row.TEXT_MATCH,
          }));
        } else {
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
      }

      // Members: always text-only (no semantic search for names/emails)
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
