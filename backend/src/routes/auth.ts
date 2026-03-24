import { FastifyInstance } from "fastify";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import oracledb from "oracledb";
import { withConnection } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendInviteEmail, sendWelcomeEmail, sendResetEmail } from "../lib/email.js";
import { processTextDocument } from "../lib/processor.js";

const USER_GUIDE_TEXT = `GUÍA DE USO DE BILERA

Panel Principal: Es la página de inicio. Muestra un resumen rápido: miembros activos, eventos del mes, documentos subidos y próximos eventos. Cada tarjeta es clicable.

Tareas: Las tareas se muestran en un tablero Kanban con tres columnas: Pendiente, En Progreso y Hecho. Arrastra las tarjetas para cambiar su estado. Usa filtros de persona y tipo para encontrar tareas.

Eventos: Aquí se registran reuniones, actos, visitas, etc. Se pueden ver en lista o calendario mensual. Para crear un evento, pulsa Nuevo, rellena título, tipo, fecha, lugar y descripción, y añade participantes. En el detalle del evento hay notas/acta a la izquierda y detalles/participantes a la derecha. Puedes adjuntar documentos y resumir con IA.

Cursos y Talleres: Gestiona cursos y actividades con inscripción pública. El asistente de 3 pasos guía la creación: datos del curso, sesiones y resumen. Las sesiones se pueden generar automáticamente con recurrencias (semanal, mensual). Se puede subir un PDF del programa y la IA rellena los campos. Modos de inscripción: FIFO (por orden de llegada), sorteo o lista de espera. Cada curso tiene un enlace público para compartir. Los inscritos reciben confirmación por email.

Espacios y Reservas: Gestiona salas y espacios con nombre, ubicación, capacidad y color. Las reservas se ven en calendario con detección de conflictos. Al crear un curso se puede seleccionar un espacio y el aforo se ajusta automáticamente.

Colaboradores: Agenda de contactos externos (proveedores, ponentes, instituciones). Cada contacto tiene nombre, email, teléfono, web y categoría. Se pueden vincular a eventos como participantes externos o asignar como instructores de cursos. Para crear un colaborador, ve a la sección Colaboradores y pulsa Nuevo.

Grupos de trabajo: Para organizar comisiones o equipos (ej: Comisión de fiestas, Equipo de comunicación). Cada grupo tiene nombre, descripción y lista de miembros. Los administradores crean y gestionan grupos.

Documentos: Repositorio central. Soporta PDF, Word, texto. Para subir, pulsa Subir, pon título, selecciona categorías y arrastra el archivo. El sistema procesa automáticamente el contenido para hacerlo buscable. Categorías disponibles: Actas, Normativa, Facturas, Subvenciones, Contratos, Certificados, Comunicados, Informes, Proyectos, Otros. Se pueden vincular a eventos.

Galería: Álbumes de fotos. Crea álbumes con título y descripción, sube múltiples fotos. Los álbumes se pueden vincular a eventos.

Asistente IA: Chat inteligente con acceso a toda la información de la asociación. Puedes preguntar sobre documentos, eventos, cursos, etc. Ejemplos: "¿Qué eventos tenemos esta semana?", "Hazme un resumen del programa del curso de cocina", "¿Cuánto costó la factura de X?". Las conversaciones se guardan automáticamente.

Administración: Los administradores acceden a Configuración (logo, tema de colores), Usuarios (gestionar miembros, invitaciones, roles), Plan y uso (recursos usados), y Uso de IA (desglose de consumo mensual). Para invitar miembros, ve a Configuración > Usuarios.

Roles: Administrador (puede crear, editar, eliminar) y Miembro (puede ver y participar). El menú lateral es colapsable. La mayoría de páginas tienen buscador y filtros con vista cuadrícula/lista.`;

async function seedUserGuide(tenantId: number, userId: string) {
  await processTextDocument(tenantId, userId, "Guía de uso de Bilera", USER_GUIDE_TEXT, "SYSTEM");
}

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
        `SELECT m.tenant_id, m.role, t.name AS tenant_name, t.slug AS tenant_slug, t.theme AS tenant_theme, t.setup_complete AS tenant_setup_complete
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
          setupComplete: !!membership.TENANT_SETUP_COMPLETE,
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
        `SELECT m.tenant_id, m.role, t.name AS tenant_name, t.slug AS tenant_slug, t.theme AS tenant_theme, t.setup_complete AS tenant_setup_complete
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
          setupComplete: !!membership.TENANT_SETUP_COMPLETE,
        },
      };
    });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", { preHandler: [requireAuth] }, async (request) => {
    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT u.id, u.email, u.name, u.avatar_path, u.phone, u.bio,
                m.role, t.name AS tenant_name, t.slug AS tenant_slug, t.theme AS tenant_theme, t.setup_complete AS tenant_setup_complete
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
        setupComplete: !!user.TENANT_SETUP_COMPLETE,
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

  // POST /api/auth/register — public self-service registration
  app.post("/api/auth/register", async (request, reply) => {
    const { orgName, name, email } = request.body as {
      orgName?: string;
      name?: string;
      email?: string;
    };

    if (!orgName || !name || !email) {
      return reply.code(400).send({ error: "Todos los campos son obligatorios" });
    }

    // Generate slug from org name
    const baseSlug = orgName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 45);

    try {
      await withConnection(async (conn) => {
        // Find unique slug (append number if needed)
        let slugClean = baseSlug || "org";
        let suffix = 0;
        while (true) {
          const candidate = suffix === 0 ? slugClean : `${slugClean}-${suffix}`;
          const slugCheck = await conn.execute<any>(
            `SELECT id FROM tenants WHERE slug = :slug`,
            { slug: candidate },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          if (!slugCheck.rows?.length) {
            slugClean = candidate;
            break;
          }
          suffix++;
        }

        // Check email uniqueness (silently skip if exists — anti-enumeration)
        const emailCheck = await conn.execute<any>(
          `SELECT id FROM users WHERE email = :email`,
          { email: email.toLowerCase() },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (emailCheck.rows?.length) {
          // Don't reveal that email exists — just return ok
          return;
        }

        // Create tenant (IDENTITY column returns generated id)
        const tenantResult = await conn.execute<any>(
          `INSERT INTO tenants (name, slug) VALUES (:name, :slug) RETURNING id INTO :id`,
          {
            name: orgName.trim(),
            slug: slugClean,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          }
        );
        const tenantId = tenantResult.outBinds.id[0];

        // Create user (inactive, with invite token)
        const userId = crypto.randomUUID();
        const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);
        const inviteToken = crypto.randomBytes(32).toString("hex");

        await conn.execute(
          `INSERT INTO users (id, email, password_hash, name, active, invite_token, invite_token_expires)
           VALUES (:id, :email, :passwordHash, :name, 0, :inviteToken, SYSTIMESTAMP + INTERVAL '7' DAY)`,
          {
            id: userId,
            email: email.toLowerCase(),
            passwordHash,
            name: name.trim(),
            inviteToken,
          }
        );

        // Create membership (admin of new tenant)
        await conn.execute(
          `INSERT INTO memberships (id, tenant_id, user_id, role)
           VALUES (:id, :tenantId, :userId, 'ADMIN')`,
          {
            id: crypto.randomUUID(),
            tenantId,
            userId,
          }
        );

        // Seed user guide as SYSTEM document (fire-and-forget)
        seedUserGuide(tenantId, userId).catch(err => console.error("Error seeding guide:", err));

        // Send welcome email with activation link
        try {
          await sendWelcomeEmail(email.toLowerCase(), name.trim(), orgName.trim(), inviteToken);
        } catch (err) {
          console.error("Error sending registration email:", err);
        }
      });
    } catch (err: any) {
      if (err.statusCode === 409) {
        return reply.code(409).send({ error: err.message });
      }
      console.error("Error in register:", err);
      return reply.code(500).send({ error: "Error al crear la cuenta" });
    }

    return { ok: true };
  });
}
