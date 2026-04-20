import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withConnection } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

type SiteConfig = {
  hero?: {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
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

export async function siteRoutes(app: FastifyInstance) {
  // ── Public: GET /api/public/sites/:slug ──
  // No auth, no VPD. Resolves slug → tenant and returns public-facing data.
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
        },
        config: parseConfig(row.SITE_CONFIG),
      };
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
        return { slug: null, enabled: false, config: {} };
      }
      return {
        slug: row.SLUG,
        enabled: !!row.SITE_ENABLED,
        config: parseConfig(row.SITE_CONFIG),
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
      };
    });
  });
}
