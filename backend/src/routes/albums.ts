import { FastifyInstance } from "fastify";
import { readFile, unlink, mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import archiver from "archiver";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getEmbedding, buildAlbumText } from "../lib/ai.js";
import { trackAiUsage } from "../lib/ai-usage.js";

async function updateAlbumEmbedding(
  id: string, tenantId: number, userId: string,
  title: string, description?: string | null
) {
  const text = buildAlbumText(title, description);
  const embResult = await getEmbedding(text);
  if (!embResult) return;
  trackAiUsage({ tenantId, userId, callType: "EMBEDDING", model: "cohere-embed-v3", inputChars: embResult.usage.inputChars });
  await withTenant(tenantId, userId, async (conn) => {
    await conn.execute(
      `UPDATE albums SET embedding = :emb WHERE id = :id`,
      { emb: { val: new Float32Array(embResult.embedding), type: oracledb.DB_TYPE_VECTOR }, id }
    );
  });
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function albumRoutes(app: FastifyInstance) {
  // GET /api/albums
  app.get("/api/albums", { preHandler: [requireAuth] }, async (request) => {
    const { search, page, limit } = request.query as {
      search?: string;
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
        whereClause += " AND (UPPER(al.title) LIKE UPPER(:search) OR UPPER(al.description) LIKE UPPER(:search))";
        countBinds.search = `%${search}%`;
        listBinds.search = `%${search}%`;
      }

      const countResult = await conn.execute<any>(
        `SELECT COUNT(*) AS total FROM albums al ${whereClause}`,
        countBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const total = countResult.rows?.[0]?.TOTAL || 0;

      const result = await conn.execute<any>(
        `SELECT al.id, al.title, al.description, al.cover_photo_id, al.visibility,
                al.created_by, al.created_at,
                u.name AS creator_name,
                (SELECT COUNT(*) FROM photos p WHERE p.album_id = al.id) AS photo_count
         FROM albums al
         LEFT JOIN users u ON u.id = al.created_by
         ${whereClause}
         ORDER BY al.created_at DESC
         OFFSET :offset ROWS FETCH NEXT :limitNum ROWS ONLY`,
        listBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        albums: (result.rows || []).map((row: any) => ({
          id: row.ID,
          title: row.TITLE,
          description: row.DESCRIPTION,
          coverPhotoId: row.COVER_PHOTO_ID,
          visibility: row.VISIBILITY,
          createdBy: row.CREATED_BY,
          creatorName: row.CREATOR_NAME,
          photoCount: row.PHOTO_COUNT,
          createdAt: row.CREATED_AT,
        })),
        total,
        page: pageNum,
        limit: limitNum,
      };
    });
  });

  // POST /api/albums
  app.post("/api/albums", { preHandler: [requireAuth] }, async (request, reply) => {
    const { title, description, visibility } = request.body as {
      title?: string;
      description?: string;
      visibility?: string;
    };

    if (!title || title.trim().length < 2) {
      return reply.code(400).send({ error: "El título es obligatorio (mínimo 2 caracteres)" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const id = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO albums (id, tenant_id, title, description, visibility, created_by)
         VALUES (:id, :tenantId, :title, :description, :visibility, :createdBy)`,
        {
          id,
          tenantId: request.user.tenantId,
          title: title.trim(),
          description: description?.trim() || null,
          visibility: visibility || "GENERAL",
          createdBy: request.user.id,
        }
      );

      // Fire-and-forget embedding generation
      updateAlbumEmbedding(id, request.user.tenantId, request.user.id, title.trim(), description)
        .catch(err => console.warn("Album embedding failed:", err));

      return reply.code(201).send({
        id,
        title: title.trim(),
        description: description?.trim() || null,
        visibility: visibility || "GENERAL",
      });
    });
  });

  // GET /api/albums/:id
  app.get("/api/albums/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT al.id, al.title, al.description, al.cover_photo_id, al.visibility,
                al.created_by, al.created_at,
                u.name AS creator_name
         FROM albums al
         LEFT JOIN users u ON u.id = al.created_by
         WHERE al.id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const album = result.rows?.[0];
      if (!album) {
        return reply.code(404).send({ error: "Álbum no encontrado" });
      }

      // Photos
      const photosResult = await conn.execute<any>(
        `SELECT p.id, p.file_name, p.file_type, p.file_size, p.width, p.height,
                p.caption, p.uploaded_by, p.created_at,
                pu.name AS uploader_name
         FROM photos p
         LEFT JOIN users pu ON pu.id = p.uploaded_by
         WHERE p.album_id = :id
         ORDER BY p.created_at ASC`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Linked activities
      const actResult = await conn.execute<any>(
        `SELECT a.id, a.title FROM album_activities aa JOIN activities a ON a.id = aa.activity_id WHERE aa.album_id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        id: album.ID,
        title: album.TITLE,
        description: album.DESCRIPTION,
        coverPhotoId: album.COVER_PHOTO_ID,
        visibility: album.VISIBILITY,
        createdBy: album.CREATED_BY,
        creatorName: album.CREATOR_NAME,
        createdAt: album.CREATED_AT,
        photos: (photosResult.rows || []).map((p: any) => ({
          id: p.ID,
          fileName: p.FILE_NAME,
          fileType: p.FILE_TYPE,
          fileSize: p.FILE_SIZE,
          width: p.WIDTH,
          height: p.HEIGHT,
          caption: p.CAPTION,
          uploadedBy: p.UPLOADED_BY,
          uploaderName: p.UPLOADER_NAME,
          createdAt: p.CREATED_AT,
        })),
        activities: (actResult.rows || []).map((a: any) => ({
          id: a.ID,
          title: a.TITLE,
        })),
      };
    });
  });

  // PUT /api/albums/:id
  app.put("/api/albums/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { title, description, coverPhotoId, visibility } = request.body as {
      title?: string;
      description?: string;
      coverPhotoId?: string | null;
      visibility?: string;
    };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id, created_by FROM albums WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Álbum no encontrado" });
      }

      if (request.user.role !== "ADMIN" && check.rows[0].CREATED_BY !== request.user.id) {
        return reply.code(403).send({ error: "No autorizado" });
      }

      await conn.execute(
        `UPDATE albums SET
           title = COALESCE(:title, title),
           description = :description,
           cover_photo_id = :coverPhotoId,
           visibility = COALESCE(:visibility, visibility),
           updated_at = SYSTIMESTAMP
         WHERE id = :id`,
        {
          id,
          title: title?.trim() || null,
          description: description?.trim() || null,
          coverPhotoId: coverPhotoId ?? null,
          visibility: visibility || null,
        }
      );

      // Fire-and-forget embedding update
      if (title) {
        updateAlbumEmbedding(id, request.user.tenantId, request.user.id, title.trim(), description)
          .catch(err => console.warn("Album embedding update failed:", err));
      }

      return { id, title: title?.trim(), description: description?.trim() || null };
    });
  });

  // DELETE /api/albums/:id
  app.delete("/api/albums/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id, created_by FROM albums WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Álbum no encontrado" });
      }

      if (request.user.role !== "ADMIN" && check.rows[0].CREATED_BY !== request.user.id) {
        return reply.code(403).send({ error: "No autorizado" });
      }

      // Get photos for file cleanup
      const photos = await conn.execute<any>(
        `SELECT file_path, thumbnail_path FROM photos WHERE album_id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // CASCADE handles DB cleanup
      await conn.execute(`DELETE FROM albums WHERE id = :id`, { id });

      // Clean up files
      for (const p of photos.rows || []) {
        try { await unlink(p.FILE_PATH); } catch {}
        try { await unlink(p.THUMBNAIL_PATH); } catch {}
      }

      return { ok: true };
    });
  });

  // POST /api/albums/:id/photos — upload photos
  app.post("/api/albums/:id/photos", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id, cover_photo_id FROM albums WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Álbum no encontrado" });
      }

      const photosDir = path.join(UPLOAD_DIR, "photos");
      const thumbsDir = path.join(UPLOAD_DIR, "thumbnails");
      await mkdir(photosDir, { recursive: true });
      await mkdir(thumbsDir, { recursive: true });

      const parts = request.files();
      const created = [];

      for await (const part of parts) {
        const buffer = await part.toBuffer();
        const photoId = crypto.randomUUID();
        const ext = path.extname(part.filename);
        const safeFileName = `${photoId}${ext}`;
        const filePath = path.join(photosDir, safeFileName);
        const thumbnailPath = path.join(thumbsDir, `${photoId}.webp`);

        try {
          await writeFile(filePath, buffer);

          // Generate thumbnail
          const metadata = await sharp(buffer).metadata();
          await sharp(buffer)
            .resize(300, 300, { fit: "cover" })
            .webp({ quality: 80 })
            .toFile(thumbnailPath);

          await conn.execute(
            `INSERT INTO photos (id, album_id, file_path, thumbnail_path, file_name, file_type, file_size, width, height, uploaded_by)
             VALUES (:id, :albumId, :filePath, :thumbnailPath, :fileName, :fileType, :fileSize, :width, :height, :uploadedBy)`,
            {
              id: photoId,
              albumId: id,
              filePath,
              thumbnailPath,
              fileName: part.filename,
              fileType: part.mimetype,
              fileSize: buffer.length,
              width: metadata.width || null,
              height: metadata.height || null,
              uploadedBy: request.user.id,
            }
          );

          created.push({
            id: photoId,
            fileName: part.filename,
            width: metadata.width,
            height: metadata.height,
          });
        } catch (err) {
          console.error(`Error uploading ${part.filename}:`, err);
        }
      }

      // Set cover if album has none
      if (!check.rows[0].COVER_PHOTO_ID && created.length > 0) {
        await conn.execute(
          `UPDATE albums SET cover_photo_id = :photoId WHERE id = :id`,
          { photoId: created[0].id, id }
        );
      }

      return reply.code(201).send({ photos: created, count: created.length });
    });
  });

  // DELETE /api/albums/:id/photos/:photoId
  app.delete("/api/albums/:id/photos/:photoId", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, photoId } = request.params as { id: string; photoId: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id, file_path, thumbnail_path FROM photos WHERE id = :photoId AND album_id = :albumId`,
        { photoId, albumId: id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!result.rows?.length) {
        return reply.code(404).send({ error: "Foto no encontrada" });
      }

      const photo = result.rows[0];
      await conn.execute(`DELETE FROM photos WHERE id = :id`, { id: photoId });

      try { await unlink(photo.FILE_PATH); } catch {}
      try { await unlink(photo.THUMBNAIL_PATH); } catch {}

      // Update cover if needed
      const albumResult = await conn.execute<any>(
        `SELECT cover_photo_id FROM albums WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (albumResult.rows?.[0]?.COVER_PHOTO_ID === photoId) {
        const next = await conn.execute<any>(
          `SELECT id FROM photos WHERE album_id = :id FETCH FIRST 1 ROW ONLY`,
          { id },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await conn.execute(
          `UPDATE albums SET cover_photo_id = :photoId WHERE id = :id`,
          { photoId: next.rows?.[0]?.ID || null, id }
        );
      }

      return { ok: true };
    });
  });

  // PATCH /api/albums/:id/photos/:photoId — update caption
  app.patch("/api/albums/:id/photos/:photoId", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, photoId } = request.params as { id: string; photoId: string };
    const { caption } = request.body as { caption?: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `UPDATE photos SET caption = :caption WHERE id = :photoId AND album_id = :albumId`,
        { caption: caption?.trim() || null, photoId, albumId: id }
      );

      if (result.rowsAffected === 0) {
        return reply.code(404).send({ error: "Foto no encontrada" });
      }

      return { id: photoId, caption: caption?.trim() || null };
    });
  });

  // Auth helper for image endpoints (supports ?token= for <img> tags)
  async function verifyImageAuth(request: any, reply: any) {
    const { token } = request.query as { token?: string };
    if (token) {
      try {
        const decoded = await app.jwt.verify(token);
        request.user = decoded;
        return;
      } catch {
        return reply.code(401).send({ error: "Token inválido" });
      }
    }
    return requireAuth(request, reply);
  }

  // GET /api/photos/:id/file — serve original photo
  app.get("/api/photos/:id/file", { preHandler: [verifyImageAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // No tenant context needed — use withTenant from request user if available
    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT p.file_path, p.file_name, p.file_type
         FROM photos p JOIN albums a ON a.id = p.album_id
         WHERE p.id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const photo = result.rows?.[0];
      if (!photo || !existsSync(photo.FILE_PATH)) {
        return reply.code(404).send({ error: "Foto no encontrada" });
      }

      const buffer = await readFile(photo.FILE_PATH);
      return reply
        .header("Content-Type", photo.FILE_TYPE || "application/octet-stream")
        .header("Cache-Control", "public, max-age=86400")
        .send(buffer);
    });
  });

  // GET /api/photos/:id/thumbnail — serve thumbnail
  app.get("/api/photos/:id/thumbnail", { preHandler: [verifyImageAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT p.thumbnail_path
         FROM photos p JOIN albums a ON a.id = p.album_id
         WHERE p.id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const photo = result.rows?.[0];
      if (!photo || !existsSync(photo.THUMBNAIL_PATH)) {
        return reply.code(404).send({ error: "Miniatura no encontrada" });
      }

      const buffer = await readFile(photo.THUMBNAIL_PATH);
      return reply
        .header("Content-Type", "image/webp")
        .header("Cache-Control", "public, max-age=86400")
        .send(buffer);
    });
  });

  // GET /api/albums/:id/download — download album as ZIP
  app.get("/api/albums/:id/download", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const albumResult = await conn.execute<any>(
        `SELECT id, title FROM albums WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!albumResult.rows?.length) {
        return reply.code(404).send({ error: "Álbum no encontrado" });
      }

      const photosResult = await conn.execute<any>(
        `SELECT file_path, file_name FROM photos WHERE album_id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!photosResult.rows?.length) {
        return reply.code(400).send({ error: "El álbum no tiene fotos" });
      }

      const albumTitle = albumResult.rows[0].TITLE.replace(/[^a-zA-Z0-9\s\-_áéíóúñÁÉÍÓÚÑ]/g, "");

      reply.raw.setHeader("Content-Type", "application/zip");
      reply.raw.setHeader("Content-Disposition", `attachment; filename="${albumTitle}.zip"`);

      const archive = archiver("zip", { zlib: { level: 5 } });
      archive.pipe(reply.raw);

      for (const photo of photosResult.rows) {
        if (existsSync(photo.FILE_PATH)) {
          archive.file(photo.FILE_PATH, { name: photo.FILE_NAME });
        }
      }

      await archive.finalize();
      return reply;
    });
  });
}
