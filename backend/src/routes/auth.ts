import { FastifyInstance } from "fastify";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import oracledb from "oracledb";
import { withConnection } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendResetEmail } from "../lib/email.js";

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
        `SELECT m.tenant_id, m.role, t.name AS tenant_name, t.slug AS tenant_slug, t.theme AS tenant_theme
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
          theme: membership.TENANT_THEME || "default",
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
        `SELECT m.tenant_id, m.role, t.name AS tenant_name, t.slug AS tenant_slug, t.theme AS tenant_theme
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
          theme: membership.TENANT_THEME || "default",
        },
      };
    });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", { preHandler: [requireAuth] }, async (request) => {
    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT u.id, u.email, u.name, u.avatar_path, u.phone, u.bio,
                m.role, t.name AS tenant_name, t.slug AS tenant_slug, t.theme AS tenant_theme
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
        tenantId: request.user.tenantId,
        tenantName: user.TENANT_NAME,
        tenantSlug: user.TENANT_SLUG,
        theme: user.TENANT_THEME || "default",
      };
    });
  });

  // GET /api/auth/verify?token= — validate invite token
  app.get("/api/auth/verify", async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      return reply.code(400).send({ error: "Token requerido" });
    }

    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id, name, active, invite_token_expires FROM users WHERE invite_token = :token`,
        { token },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const user = result.rows?.[0];
      if (!user) {
        return reply.code(400).send({ error: "Token inválido o expirado" });
      }

      if (user.INVITE_TOKEN_EXPIRES && new Date(user.INVITE_TOKEN_EXPIRES) < new Date()) {
        return reply.code(400).send({ error: "El enlace ha expirado. Contacta con un administrador para que te reenvíe la invitación." });
      }

      if (user.ACTIVE) {
        return { name: user.NAME, alreadyActive: true };
      }

      return { name: user.NAME, alreadyActive: false };
    });
  });

  // POST /api/auth/activate — set password and activate account
  app.post("/api/auth/activate", async (request, reply) => {
    const { token, password } = request.body as { token?: string; password?: string };

    if (!token || !password) {
      return reply.code(400).send({ error: "Token y contraseña son obligatorios" });
    }
    if (password.length < 6) {
      return reply.code(400).send({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id, active, invite_token_expires FROM users WHERE invite_token = :token`,
        { token },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const user = result.rows?.[0];
      if (!user) {
        return reply.code(400).send({ error: "Token inválido o expirado" });
      }

      if (user.INVITE_TOKEN_EXPIRES && new Date(user.INVITE_TOKEN_EXPIRES) < new Date()) {
        return reply.code(400).send({ error: "El enlace ha expirado. Contacta con un administrador para que te reenvíe la invitación." });
      }

      if (user.ACTIVE) {
        return reply.code(400).send({ error: "La cuenta ya está activa" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await conn.execute(
        `UPDATE users SET password_hash = :passwordHash, active = 1, invite_token = NULL, invite_token_expires = NULL, updated_at = SYSTIMESTAMP WHERE id = :id`,
        { passwordHash, id: user.ID }
      );

      return { ok: true };
    });
  });

  // POST /api/auth/forgot-password — request password reset email
  app.post("/api/auth/forgot-password", async (request) => {
    const { email } = request.body as { email?: string };

    // Always return ok (anti-enumeration)
    if (!email) return { ok: true };

    try {
      await withConnection(async (conn) => {
        const result = await conn.execute<any>(
          `SELECT id, name, active FROM users WHERE email = :email`,
          { email: email.toLowerCase() },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const user = result.rows?.[0];
        if (!user || !user.ACTIVE) return;

        const token = crypto.randomBytes(32).toString("hex");
        await conn.execute(
          `UPDATE users SET reset_token = :token, reset_token_expires = SYSTIMESTAMP + INTERVAL '15' MINUTE, updated_at = SYSTIMESTAMP WHERE id = :id`,
          { token, id: user.ID }
        );

        await sendResetEmail(email.toLowerCase(), user.NAME, token);
      });
    } catch (err) {
      // Log but don't expose errors
      console.error("Error in forgot-password:", err);
    }

    return { ok: true };
  });

  // POST /api/auth/reset-password — reset password with token
  app.post("/api/auth/reset-password", async (request, reply) => {
    const { token, password } = request.body as { token?: string; password?: string };

    if (!token || !password) {
      return reply.code(400).send({ error: "Token y contraseña son obligatorios" });
    }
    if (password.length < 6) {
      return reply.code(400).send({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id FROM users WHERE reset_token = :token AND reset_token_expires > SYSTIMESTAMP AND active = 1`,
        { token },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const user = result.rows?.[0];
      if (!user) {
        return reply.code(400).send({ error: "Token inválido o expirado" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await conn.execute(
        `UPDATE users SET password_hash = :passwordHash, reset_token = NULL, reset_token_expires = NULL, updated_at = SYSTIMESTAMP WHERE id = :id`,
        { passwordHash, id: user.ID }
      );

      return { ok: true };
    });
  });
}
