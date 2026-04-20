import { FastifyInstance } from "fastify";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import oracledb from "oracledb";
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
}
