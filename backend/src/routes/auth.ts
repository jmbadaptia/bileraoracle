import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import oracledb from "oracledb";
import { withConnection } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post("/api/auth/login", async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      return reply.code(400).send({ error: "Email y contraseña son obligatorios" });
    }

    return withConnection(async (conn) => {
      // Find user
      const userResult = await conn.execute<any>(
        `SELECT id, email, name, password_hash, active FROM users WHERE email = :email`,
        { email: email.toLowerCase() },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const user = userResult.rows?.[0];
      if (!user || !user.ACTIVE) {
        return reply.code(401).send({ error: "Credenciales inválidas" });
      }

      const validPassword = await bcrypt.compare(password, user.PASSWORD_HASH);
      if (!validPassword) {
        return reply.code(401).send({ error: "Credenciales inválidas" });
      }

      // Get all memberships
      const membResult = await conn.execute<any>(
        `SELECT m.tenant_id, m.role, t.name AS tenant_name, t.slug AS tenant_slug
         FROM memberships m
         JOIN tenants t ON t.id = m.tenant_id
         WHERE m.user_id = :userId AND t.active = 1
         ORDER BY t.name`,
        { userId: user.ID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const memberships = membResult.rows || [];
      if (memberships.length === 0) {
        return reply.code(401).send({ error: "No perteneces a ninguna organización activa" });
      }

      // Use first membership by default
      const membership = memberships[0];

      const token = app.jwt.sign({
        id: user.ID,
        email: user.EMAIL,
        name: user.NAME,
        tenantId: membership.TENANT_ID,
        role: membership.ROLE,
      });

      return {
        token,
        user: {
          id: user.ID,
          email: user.EMAIL,
          name: user.NAME,
          role: membership.ROLE,
          tenantId: membership.TENANT_ID,
          tenantName: membership.TENANT_NAME,
          tenantSlug: membership.TENANT_SLUG,
        },
        // If multiple tenants, send list so frontend shows selector
        tenants: memberships.length > 1
          ? memberships.map((m: any) => ({
              id: m.TENANT_ID,
              name: m.TENANT_NAME,
              slug: m.TENANT_SLUG,
              role: m.ROLE,
            }))
          : undefined,
      };
    });
  });

  // POST /api/auth/switch-tenant
  app.post("/api/auth/switch-tenant", { preHandler: [requireAuth] }, async (request, reply) => {
    const { tenantId } = request.body as { tenantId: number };

    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT m.tenant_id, m.role, t.name AS tenant_name, t.slug AS tenant_slug
         FROM memberships m
         JOIN tenants t ON t.id = m.tenant_id
         WHERE m.user_id = :userId AND m.tenant_id = :tenantId AND t.active = 1`,
        { userId: request.user.id, tenantId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const membership = result.rows?.[0];
      if (!membership) {
        return reply.code(403).send({ error: "No perteneces a esta organización" });
      }

      const token = app.jwt.sign({
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
        tenantId: membership.TENANT_ID,
        role: membership.ROLE,
      });

      return {
        token,
        user: {
          id: request.user.id,
          email: request.user.email,
          name: request.user.name,
          role: membership.ROLE,
          tenantId: membership.TENANT_ID,
          tenantName: membership.TENANT_NAME,
          tenantSlug: membership.TENANT_SLUG,
        },
      };
    });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", { preHandler: [requireAuth] }, async (request) => {
    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT u.id, u.email, u.name, u.avatar_path, u.phone, u.bio,
                m.role, t.name AS tenant_name, t.slug AS tenant_slug
         FROM users u
         JOIN memberships m ON m.user_id = u.id AND m.tenant_id = :tenantId
         JOIN tenants t ON t.id = m.tenant_id
         WHERE u.id = :userId`,
        { userId: request.user.id, tenantId: request.user.tenantId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const user = result.rows?.[0];
      if (!user) {
        return { error: "Usuario no encontrado" };
      }

      return {
        id: user.ID,
        email: user.EMAIL,
        name: user.NAME,
        avatarPath: user.AVATAR_PATH,
        phone: user.PHONE,
        bio: user.BIO,
        role: user.ROLE,
        tenantName: user.TENANT_NAME,
        tenantSlug: user.TENANT_SLUG,
      };
    });
  });
}
