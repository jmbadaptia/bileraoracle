import { FastifyInstance } from "fastify";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import oracledb from "oracledb";
import nodemailer from "nodemailer";
import { withConnection } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_HERO_SIZE = 5 * 1024 * 1024;

type SiteConfig = {
  hero?: {
    title?: string;
    subtitle?: string;
  };
  about?: {
    text?: string;
  };
  gallery?: {
    enabled?: boolean;
  };
  contacto?: {
    email?: string;
    telefono?: string;
    direccion?: string;
    facebook?: string;
    instagram?: string;
  };
  meta?: {
    categoria?: string;
    ciudad?: string;
    anoFundacion?: number;
    numSocios?: number;
  };
};

function parseConfig(raw: string | null): SiteConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function heroPath(tenantId: number) {
  return path.join(UPLOAD_DIR, "hero", `${tenantId}.jpg`);
}

export async function siteRoutes(app: FastifyInstance) {
  // ── Public: GET /api/public/sites/:slug ──
  app.get("/api/public/sites/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!slug || !SLUG_RE.test(slug)) {
      return reply.code(404).send({ error: "Sitio no encontrado" });
    }

    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id, name, slug, logo_path, theme, site_enabled, site_config
         FROM tenants
         WHERE slug = :slug AND active = 1`,
        { slug },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const row = result.rows?.[0];
      if (!row || !row.SITE_ENABLED) {
        return reply.code(404).send({ error: "Sitio no encontrado" });
      }
      return {
        tenant: {
          id: row.ID,
          name: row.NAME,
          slug: row.SLUG,
          theme: row.THEME || "default",
          hasLogo: !!row.LOGO_PATH,
          hasHero: existsSync(heroPath(row.ID)),
        },
        config: parseConfig(row.SITE_CONFIG),
      };
    });
  });

  // ── Public: GET /api/public/sites/:slug/hero-image ──
  app.get("/api/public/sites/:slug/hero-image", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!slug || !SLUG_RE.test(slug)) {
      return reply.code(404).send({ error: "No encontrado" });
    }
    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id FROM tenants WHERE slug = :slug AND active = 1 AND site_enabled = 1`,
        { slug },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const row = result.rows?.[0];
      if (!row) return reply.code(404).send({ error: "No encontrado" });
      const hp = heroPath(row.ID);
      if (!existsSync(hp)) return reply.code(404).send({ error: "Sin imagen" });
      const buffer = await readFile(hp);
      return reply
        .type("image/jpeg")
        .header("Cache-Control", "public, max-age=300")
        .send(buffer);
    });
  });

  // ── Admin: GET /api/my-tenant/site ──
  app.get("/api/my-tenant/site", { preHandler: [requireAuth] }, async (request) => {
    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT slug, site_enabled, site_config
         FROM tenants
         WHERE id = :tenantId`,
        { tenantId: request.user.tenantId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const row = result.rows?.[0];
      if (!row) {
        return { slug: null, enabled: false, config: {}, hasHero: false };
      }
      return {
        slug: row.SLUG,
        enabled: !!row.SITE_ENABLED,
        config: parseConfig(row.SITE_CONFIG),
        hasHero: existsSync(heroPath(request.user.tenantId)),
      };
    });
  });

  // ── Admin: PUT /api/my-tenant/site ──
  app.put("/api/my-tenant/site", { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = request.body as {
      slug?: string;
      enabled?: boolean;
      config?: SiteConfig;
    };

    const updates: string[] = [];
    const binds: Record<string, any> = { tenantId: request.user.tenantId };

    if (typeof body.slug === "string") {
      const slug = body.slug.trim().toLowerCase();
      if (!SLUG_RE.test(slug)) {
        return reply.code(400).send({
          error: "Slug inválido. Usa letras minúsculas, números y guiones (3-64 caracteres).",
        });
      }
      updates.push("slug = :slug");
      binds.slug = slug;
    }

    if (typeof body.enabled === "boolean") {
      updates.push("site_enabled = :siteEnabled");
      binds.siteEnabled = body.enabled ? 1 : 0;
    }

    if (body.config !== undefined) {
      updates.push("site_config = :siteConfig");
      binds.siteConfig = JSON.stringify(body.config ?? {});
    }

    if (updates.length === 0) {
      return reply.code(400).send({ error: "No hay cambios que aplicar" });
    }

    return withConnection(async (conn) => {
      try {
        await conn.execute(
          `UPDATE tenants SET ${updates.join(", ")}, updated_at = SYSTIMESTAMP
           WHERE id = :tenantId`,
          binds
        );
        await conn.commit();
      } catch (err: any) {
        if (err?.errorNum === 1) {
          return reply.code(409).send({ error: "Ese slug ya está en uso por otra asociación" });
        }
        throw err;
      }

      const result = await conn.execute<any>(
        `SELECT slug, site_enabled, site_config FROM tenants WHERE id = :tenantId`,
        { tenantId: request.user.tenantId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const row = result.rows?.[0];
      return {
        slug: row?.SLUG,
        enabled: !!row?.SITE_ENABLED,
        config: parseConfig(row?.SITE_CONFIG),
        hasHero: existsSync(heroPath(request.user.tenantId)),
      };
    });
  });

  // ── Admin: POST /api/my-tenant/site/hero (upload hero image) ──
  app.post("/api/my-tenant/site/hero", { preHandler: [requireAdmin] }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "No se envió ningún archivo" });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return reply.code(400).send({ error: "Tipo de archivo no permitido. Usa PNG, JPG o WebP." });
    }
    const buffer = await file.toBuffer();
    if (buffer.length > MAX_HERO_SIZE) {
      return reply.code(400).send({ error: "La imagen excede el tamaño máximo de 5MB" });
    }

    const hp = heroPath(request.user.tenantId);
    const dir = path.dirname(hp);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(hp, buffer);
    return { ok: true };
  });

  // ── Admin: DELETE /api/my-tenant/site/hero ──
  app.delete("/api/my-tenant/site/hero", { preHandler: [requireAdmin] }, async (request) => {
    const hp = heroPath(request.user.tenantId);
    if (existsSync(hp)) {
      await unlink(hp);
    }
    return { ok: true };
  });

  // ── Public: GET /api/public/sites/:slug/events ──
  // Upcoming GENERAL events (type EVENT/OTHER, PUBLISHED, start_date >= today)
  app.get("/api/public/sites/:slug/events", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!slug || !SLUG_RE.test(slug)) {
      return reply.code(404).send({ error: "No encontrado" });
    }
    return withConnection(async (conn) => {
      const t = await conn.execute<any>(
        `SELECT id FROM tenants WHERE slug = :slug AND active = 1 AND site_enabled = 1`,
        { slug },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const tenant = t.rows?.[0];
      if (!tenant) return reply.code(404).send({ error: "No encontrado" });

      const r = await conn.execute<any>(
        `SELECT id, title, description, type, start_date, location, cover_image_path
         FROM activities
         WHERE tenant_id = :tenantId
           AND visibility = 'GENERAL'
           AND status = 'PUBLISHED'
           AND type IN ('EVENT', 'OTHER')
           AND start_date >= TRUNC(SYSDATE)
         ORDER BY start_date ASC
         FETCH FIRST 6 ROWS ONLY`,
        { tenantId: tenant.ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return {
        events: (r.rows || []).map((row: any) => ({
          id: row.ID,
          title: row.TITLE,
          description: row.DESCRIPTION || "",
          type: row.TYPE,
          startDate: row.START_DATE,
          location: row.LOCATION,
          hasCover: !!row.COVER_IMAGE_PATH,
        })),
      };
    });
  });

  // ── Public: GET /api/public/sites/:slug/courses ──
  // CURSO/TALLER GENERAL with enrollment open (deadline not passed)
  app.get("/api/public/sites/:slug/courses", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!slug || !SLUG_RE.test(slug)) {
      return reply.code(404).send({ error: "No encontrado" });
    }
    return withConnection(async (conn) => {
      const t = await conn.execute<any>(
        `SELECT id FROM tenants WHERE slug = :slug AND active = 1 AND site_enabled = 1`,
        { slug },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const tenant = t.rows?.[0];
      if (!tenant) return reply.code(404).send({ error: "No encontrado" });

      const r = await conn.execute<any>(
        `SELECT id, title, start_date, max_capacity, enrollment_price, enrollment_deadline, cover_image_path
         FROM activities
         WHERE tenant_id = :tenantId
           AND visibility = 'GENERAL'
           AND status = 'PUBLISHED'
           AND type IN ('CURSO', 'TALLER')
           AND enrollment_enabled = 1
           AND (enrollment_deadline IS NULL OR enrollment_deadline >= SYSTIMESTAMP)
         ORDER BY start_date ASC NULLS LAST, title ASC
         FETCH FIRST 6 ROWS ONLY`,
        { tenantId: tenant.ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return {
        courses: (r.rows || []).map((row: any) => ({
          id: row.ID,
          title: row.TITLE,
          startDate: row.START_DATE,
          maxCapacity: row.MAX_CAPACITY,
          price: row.ENROLLMENT_PRICE != null ? Number(row.ENROLLMENT_PRICE) : null,
          deadline: row.ENROLLMENT_DEADLINE,
          hasCover: !!row.COVER_IMAGE_PATH,
        })),
      };
    });
  });

  // ── Public: GET /api/public/sites/:slug/gallery ──
  // Photos from albums with visibility=GENERAL, newest first.
  app.get("/api/public/sites/:slug/gallery", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!slug || !SLUG_RE.test(slug)) {
      return reply.code(404).send({ error: "No encontrado" });
    }
    return withConnection(async (conn) => {
      const t = await conn.execute<any>(
        `SELECT id, site_config FROM tenants WHERE slug = :slug AND active = 1 AND site_enabled = 1`,
        { slug },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const tenant = t.rows?.[0];
      if (!tenant) return reply.code(404).send({ error: "No encontrado" });

      const cfg = parseConfig(tenant.SITE_CONFIG);
      if (!cfg.gallery?.enabled) return { photos: [] };

      const r = await conn.execute<any>(
        `SELECT p.id, p.caption, p.created_at
         FROM photos p
         JOIN albums a ON a.id = p.album_id
         WHERE a.tenant_id = :tenantId
           AND a.visibility = 'GENERAL'
         ORDER BY p.created_at DESC
         FETCH FIRST 12 ROWS ONLY`,
        { tenantId: tenant.ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return {
        photos: (r.rows || []).map((row: any) => ({
          id: row.ID,
          alt: row.CAPTION || "",
        })),
      };
    });
  });

  // ── Public: GET /api/public/photos/:photoId/thumbnail ──
  // Serves thumbnail if photo belongs to a GENERAL album of an enabled site.
  app.get("/api/public/photos/:photoId/thumbnail", async (request, reply) => {
    const { photoId } = request.params as { photoId: string };
    return withConnection(async (conn) => {
      const r = await conn.execute<any>(
        `SELECT p.thumbnail_path
         FROM photos p
         JOIN albums a ON a.id = p.album_id
         JOIN tenants t ON t.id = a.tenant_id
         WHERE p.id = :photoId
           AND a.visibility = 'GENERAL'
           AND t.active = 1
           AND t.site_enabled = 1`,
        { photoId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const photo = r.rows?.[0];
      if (!photo || !existsSync(photo.THUMBNAIL_PATH)) {
        return reply.code(404).send({ error: "No encontrado" });
      }
      const buffer = await readFile(photo.THUMBNAIL_PATH);
      return reply
        .header("Content-Type", "image/webp")
        .header("Cache-Control", "public, max-age=86400")
        .send(buffer);
    });
  });

  // ── Public: GET /api/public/photos/:photoId/file (original) ──
  app.get("/api/public/photos/:photoId/file", async (request, reply) => {
    const { photoId } = request.params as { photoId: string };
    return withConnection(async (conn) => {
      const r = await conn.execute<any>(
        `SELECT p.file_path, p.file_type
         FROM photos p
         JOIN albums a ON a.id = p.album_id
         JOIN tenants t ON t.id = a.tenant_id
         WHERE p.id = :photoId
           AND a.visibility = 'GENERAL'
           AND t.active = 1
           AND t.site_enabled = 1`,
        { photoId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const photo = r.rows?.[0];
      if (!photo || !existsSync(photo.FILE_PATH)) {
        return reply.code(404).send({ error: "No encontrado" });
      }
      const buffer = await readFile(photo.FILE_PATH);
      return reply
        .header("Content-Type", photo.FILE_TYPE || "application/octet-stream")
        .header("Cache-Control", "public, max-age=86400")
        .send(buffer);
    });
  });

  // ── Public: POST /api/public/sites/:slug/contact ──
  // Receives form submission from the mini-site and emails the tenant admin.
  app.post("/api/public/sites/:slug/contact", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const body = request.body as {
      nombre?: string;
      email?: string;
      asunto?: string;
      mensaje?: string;
    };
    if (!slug || !SLUG_RE.test(slug)) {
      return reply.code(404).send({ error: "No encontrado" });
    }
    if (!body?.nombre || !body?.email || !body?.asunto || !body?.mensaje) {
      return reply.code(400).send({ error: "Faltan campos" });
    }

    const row = await withConnection(async (conn) => {
      const r = await conn.execute<any>(
        `SELECT id, name, site_enabled, site_config FROM tenants WHERE slug = :slug AND active = 1`,
        { slug },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return r.rows?.[0];
    });
    if (!row || !row.SITE_ENABLED) {
      return reply.code(404).send({ error: "No encontrado" });
    }

    const config = parseConfig(row.SITE_CONFIG);
    const dest = config.contacto?.email;
    if (!dest) {
      return reply.code(400).send({ error: "La asociación no ha configurado un email de contacto" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "1025"),
      secure: process.env.SMTP_SECURE === "true",
      ...(process.env.SMTP_USER
        ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
        : {}),
    });

    const subject = `[${row.NAME}] ${body.asunto}`;
    const text =
      `Nuevo mensaje desde el mini-site de ${row.NAME}\n\n` +
      `De: ${body.nombre} <${body.email}>\n` +
      `Asunto: ${body.asunto}\n\n` +
      `${body.mensaje}\n`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "Bilera <noreply@bilera.es>",
        to: dest,
        replyTo: `${body.nombre} <${body.email}>`,
        subject,
        text,
      });
    } catch (err: any) {
      app.log.error({ err }, "contact form email failed");
      return reply.code(500).send({ error: "No se pudo enviar el mensaje" });
    }

    return { ok: true };
  });
}
