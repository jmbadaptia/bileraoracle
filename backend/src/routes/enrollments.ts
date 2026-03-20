import { FastifyInstance } from "fastify";
import crypto from "crypto";
import { readFile, existsSync } from "fs";
import { readFile as readFileAsync } from "fs/promises";
import oracledb from "oracledb";
import { withTenant, withConnection } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { sendEnrollmentEmail, sendEnrollmentResultEmail } from "../lib/email.js";

export async function enrollmentRoutes(app: FastifyInstance) {
  // GET /api/enrollments/public/:activityId — public activity info
  app.get("/api/enrollments/public/:activityId", async (request, reply) => {
    const { activityId } = request.params as { activityId: string };

    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT a.id, a.title, a.description, a.start_date, a.location, a.type,
                a.enrollment_enabled, a.enrollment_mode, a.max_capacity,
                a.enrollment_price, a.enrollment_deadline,
                a.publish_status, a.publish_date, a.program_text, t.name AS tenant_name
         FROM activities a
         JOIN tenants t ON t.id = a.tenant_id
         WHERE a.id = :id`,
        { id: activityId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const activity = result.rows?.[0];
      if (!activity || !activity.ENROLLMENT_ENABLED) {
        return reply.code(404).send({ error: "Actividad no encontrada o sin inscripciones" });
      }

      // Check publish status — auto-publish if publish_date has arrived
      const publishStatus = activity.PUBLISH_STATUS || "PUBLISHED";
      const autoPublished = publishStatus === "DRAFT" && activity.PUBLISH_DATE && new Date(activity.PUBLISH_DATE) <= new Date();
      if (publishStatus === "DRAFT" && !autoPublished) {
        return reply.code(404).send({ error: "Inscripciones aún no publicadas" });
      }

      const countResult = await conn.execute<any>(
        `SELECT COUNT(*) AS cnt FROM enrollments
         WHERE activity_id = :id AND status IN ('CONFIRMED', 'PENDING')`,
        { id: activityId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const spotsTaken = countResult.rows?.[0]?.CNT || 0;

      const deadlinePassed = activity.ENROLLMENT_DEADLINE &&
        new Date(activity.ENROLLMENT_DEADLINE) < new Date();
      const isFull = activity.MAX_CAPACITY && spotsTaken >= activity.MAX_CAPACITY;
      const isOpen = !deadlinePassed && !(activity.ENROLLMENT_MODE === "FIFO" && isFull);

      // Get linked documents with extracted text (for program display)
      const docsResult = await conn.execute<any>(
        `SELECT d.id, d.title, d.file_name, d.file_type, d.extracted_text, d.status
         FROM document_activities da
         JOIN documents d ON d.id = da.document_id
         WHERE da.activity_id = :id AND d.status = 'READY'
         ORDER BY d.created_at`,
        { id: activityId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const documents = (docsResult.rows || []).map((d: any) => ({
        id: d.ID,
        title: d.TITLE,
        fileName: d.FILE_NAME,
        fileType: d.FILE_TYPE,
        extractedText: d.EXTRACTED_TEXT,
      }));

      return {
        id: activity.ID,
        title: activity.TITLE,
        description: activity.DESCRIPTION,
        startDate: activity.START_DATE,
        location: activity.LOCATION,
        type: activity.TYPE,
        tenantName: activity.TENANT_NAME,
        enrollmentMode: activity.ENROLLMENT_MODE,
        maxCapacity: activity.MAX_CAPACITY,
        enrollmentPrice: activity.ENROLLMENT_PRICE,
        enrollmentDeadline: activity.ENROLLMENT_DEADLINE,
        programText: activity.PROGRAM_TEXT,
        spotsTaken,
        spotsAvailable: activity.MAX_CAPACITY ? activity.MAX_CAPACITY - spotsTaken : null,
        isOpen,
        documents,
      };
    });
  });

  // GET /api/enrollments/public/:activityId/documents/:docId — public document download
  app.get("/api/enrollments/public/:activityId/documents/:docId", async (request, reply) => {
    const { activityId, docId } = request.params as { activityId: string; docId: string };

    return withConnection(async (conn) => {
      // Verify the document belongs to this activity and activity has enrollment enabled
      const result = await conn.execute<any>(
        `SELECT d.file_path, d.file_name, d.file_type
         FROM documents d
         JOIN document_activities da ON da.document_id = d.id
         JOIN activities a ON a.id = da.activity_id
         WHERE d.id = :docId AND da.activity_id = :actId AND a.enrollment_enabled = 1`,
        { docId, actId: activityId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const doc = result.rows?.[0];
      if (!doc || !doc.FILE_PATH) {
        return reply.code(404).send({ error: "Documento no encontrado" });
      }

      try {
        const buffer = await readFileAsync(doc.FILE_PATH);
        return reply
          .type(doc.FILE_TYPE || "application/octet-stream")
          .header("Content-Disposition", `inline; filename="${doc.FILE_NAME}"`)
          .send(buffer);
      } catch {
        return reply.code(404).send({ error: "Archivo no encontrado" });
      }
    });
  });

  // PATCH /api/enrollments/cancel-by-token?token=xxx — public cancel by token
  app.patch("/api/enrollments/cancel-by-token", async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) {
      return reply.code(400).send({ error: "Token requerido" });
    }

    return withConnection(async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id, activity_id, status, name, email FROM enrollments WHERE cancel_token = :token`,
        { token },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const enrollment = result.rows?.[0];
      if (!enrollment) {
        return reply.code(404).send({ error: "Inscripción no encontrada" });
      }
      if (enrollment.STATUS === "CANCELLED") {
        return reply.code(400).send({ error: "La inscripción ya está cancelada" });
      }

      const wasConfirmed = enrollment.STATUS === "CONFIRMED";

      await conn.execute(
        `UPDATE enrollments SET status = 'CANCELLED', cancelled_at = SYSTIMESTAMP WHERE id = :id`,
        { id: enrollment.ID }
      );

      // Promote from waitlist
      if (wasConfirmed) {
        const nextResult = await conn.execute<any>(
          `SELECT id, name, email FROM enrollments
           WHERE activity_id = :actId AND status = 'WAITLISTED'
           ORDER BY position FETCH FIRST 1 ROW ONLY`,
          { actId: enrollment.ACTIVITY_ID },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const next = nextResult.rows?.[0];
        if (next) {
          await conn.execute(
            `UPDATE enrollments SET status = 'CONFIRMED', confirmed_at = SYSTIMESTAMP WHERE id = :id`,
            { id: next.ID }
          );
          try {
            const actResult = await conn.execute<any>(
              `SELECT title FROM activities WHERE id = :id`,
              { id: enrollment.ACTIVITY_ID },
              { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            await sendEnrollmentResultEmail(next.EMAIL, next.NAME, actResult.rows?.[0]?.TITLE || "", "CONFIRMED");
          } catch (err) {
            console.error("Error sending promotion email:", err);
          }
        }
      }

      return { ok: true };
    });
  });

  // POST /api/enrollments/:activityId — public enrollment
  app.post("/api/enrollments/:activityId", async (request, reply) => {
    const { activityId } = request.params as { activityId: string };
    const { name, email, phone } = request.body as {
      name?: string;
      email?: string;
      phone?: string;
    };

    if (!name?.trim() || !email?.trim()) {
      return reply.code(400).send({ error: "Nombre y email son obligatorios" });
    }

    return withConnection(async (conn) => {
      // Lock activity row to prevent race conditions
      const actResult = await conn.execute<any>(
        `SELECT id, tenant_id, enrollment_enabled, enrollment_mode, max_capacity,
                enrollment_deadline, title
         FROM activities WHERE id = :id FOR UPDATE`,
        { id: activityId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const activity = actResult.rows?.[0];
      if (!activity || !activity.ENROLLMENT_ENABLED) {
        return reply.code(404).send({ error: "Actividad no encontrada o sin inscripciones" });
      }

      // Check deadline
      if (activity.ENROLLMENT_DEADLINE && new Date(activity.ENROLLMENT_DEADLINE) < new Date()) {
        return reply.code(400).send({ error: "El plazo de inscripción ha finalizado" });
      }

      // Check duplicate email
      const dupResult = await conn.execute<any>(
        `SELECT id FROM enrollments
         WHERE activity_id = :actId AND email = :email AND status != 'CANCELLED'`,
        { actId: activityId, email: email.toLowerCase().trim() },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (dupResult.rows?.length) {
        return reply.code(409).send({ error: "Ya existe una inscripción con este email" });
      }

      // Count current enrollments
      const countResult = await conn.execute<any>(
        `SELECT COUNT(*) AS cnt FROM enrollments
         WHERE activity_id = :id AND status IN ('CONFIRMED', 'PENDING')`,
        { id: activityId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const currentCount = countResult.rows?.[0]?.CNT || 0;

      // Determine status
      let status: string;
      if (activity.ENROLLMENT_MODE === "LOTTERY") {
        status = "PENDING";
      } else {
        // FIFO
        if (!activity.MAX_CAPACITY || currentCount < activity.MAX_CAPACITY) {
          status = "CONFIRMED";
        } else {
          status = "WAITLISTED";
        }
      }

      // Get next position
      const posResult = await conn.execute<any>(
        `SELECT NVL(MAX(position), 0) + 1 AS next_pos FROM enrollments
         WHERE activity_id = :id AND status != 'CANCELLED'`,
        { id: activityId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const position = posResult.rows?.[0]?.NEXT_POS || 1;

      const enrollmentId = crypto.randomUUID();
      const cancelToken = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO enrollments (id, tenant_id, activity_id, name, email, phone, status, cancel_token, position, confirmed_at)
         VALUES (:id, :tenantId, :actId, :name, :email, :phone, :status, :cancelToken, :position,
                 CASE WHEN :status2 = 'CONFIRMED' THEN SYSTIMESTAMP ELSE NULL END)`,
        {
          id: enrollmentId,
          tenantId: activity.TENANT_ID,
          actId: activityId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone?.trim() || null,
          status,
          cancelToken,
          position,
          status2: status,
        }
      );

      // Send confirmation email
      try {
        await sendEnrollmentEmail(
          email.toLowerCase().trim(),
          name.trim(),
          activity.TITLE,
          status,
          activityId,
          cancelToken
        );
      } catch (err) {
        console.error("Error sending enrollment email:", err);
      }

      return {
        id: enrollmentId,
        status,
        position,
        cancelToken,
      };
    });
  });

  // PATCH /api/enrollments/:id/cancel — cancel (public with token or admin)
  app.patch("/api/enrollments/:id/cancel", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { token } = request.query as { token?: string };

    // Determine if public or admin cancel
    const isPublic = !!token;

    const doCancel = async (conn: oracledb.Connection) => {
      // Find enrollment
      let query: string;
      let params: any;
      if (isPublic) {
        query = `SELECT id, activity_id, status, name, email FROM enrollments WHERE id = :id AND cancel_token = :token`;
        params = { id, token };
      } else {
        query = `SELECT id, activity_id, status, name, email FROM enrollments WHERE id = :id`;
        params = { id };
      }

      const result = await conn.execute<any>(query, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const enrollment = result.rows?.[0];
      if (!enrollment) {
        return reply.code(404).send({ error: "Inscripción no encontrada" });
      }
      if (enrollment.STATUS === "CANCELLED") {
        return reply.code(400).send({ error: "La inscripción ya está cancelada" });
      }

      const wasConfirmed = enrollment.STATUS === "CONFIRMED";

      // Cancel it
      await conn.execute(
        `UPDATE enrollments SET status = 'CANCELLED', cancelled_at = SYSTIMESTAMP WHERE id = :id`,
        { id }
      );

      // Promote from waitlist if the cancelled one was confirmed
      if (wasConfirmed) {
        const nextResult = await conn.execute<any>(
          `SELECT id, name, email FROM enrollments
           WHERE activity_id = :actId AND status = 'WAITLISTED'
           ORDER BY position FETCH FIRST 1 ROW ONLY`,
          { actId: enrollment.ACTIVITY_ID },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const next = nextResult.rows?.[0];
        if (next) {
          await conn.execute(
            `UPDATE enrollments SET status = 'CONFIRMED', confirmed_at = SYSTIMESTAMP WHERE id = :id`,
            { id: next.ID }
          );
          // Notify promoted person
          try {
            const actResult = await conn.execute<any>(
              `SELECT title FROM activities WHERE id = :id`,
              { id: enrollment.ACTIVITY_ID },
              { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            await sendEnrollmentResultEmail(
              next.EMAIL, next.NAME,
              actResult.rows?.[0]?.TITLE || "",
              "CONFIRMED"
            );
          } catch (err) {
            console.error("Error sending promotion email:", err);
          }
        }
      }

      return { ok: true };
    };

    if (isPublic) {
      return withConnection(doCancel);
    } else {
      // Admin — need auth
      const auth = request.headers.authorization;
      if (!auth) return reply.code(401).send({ error: "No autorizado" });
      try {
        await (request as any).jwtVerify();
      } catch {
        return reply.code(401).send({ error: "No autorizado" });
      }
      return withTenant((request as any).user.tenantId, (request as any).user.id, doCancel);
    }
  });

  // GET /api/activities/:id/enrollments — admin list
  app.get("/api/activities/:id/enrollments", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const { status, page, limit } = request.query as {
      status?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page || "1");
    const limitNum = Math.min(parseInt(limit || "50"), 100);
    const offset = (pageNum - 1) * limitNum;

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Stats
      const statsResult = await conn.execute<any>(
        `SELECT status, COUNT(*) AS cnt FROM enrollments
         WHERE activity_id = :id GROUP BY status`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const stats: Record<string, number> = { CONFIRMED: 0, WAITLISTED: 0, PENDING: 0, CANCELLED: 0 };
      for (const row of statsResult.rows || []) {
        stats[row.STATUS] = row.CNT;
      }

      // List
      let whereClause = "WHERE activity_id = :id";
      const params: any = { id, lim: limitNum, off: offset };
      if (status && status !== "all") {
        whereClause += " AND status = :status";
        params.status = status;
      }

      const listResult = await conn.execute<any>(
        `SELECT id, name, email, phone, status, position, enrolled_at, confirmed_at, cancelled_at
         FROM enrollments ${whereClause}
         ORDER BY position
         OFFSET :off ROWS FETCH NEXT :lim ROWS ONLY`,
        params,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const countResult = await conn.execute<any>(
        `SELECT COUNT(*) AS cnt FROM enrollments ${whereClause}`,
        { id, ...(status && status !== "all" ? { status } : {}) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        enrollments: (listResult.rows || []).map((r: any) => ({
          id: r.ID,
          name: r.NAME,
          email: r.EMAIL,
          phone: r.PHONE,
          status: r.STATUS,
          position: r.POSITION,
          enrolledAt: r.ENROLLED_AT,
          confirmedAt: r.CONFIRMED_AT,
          cancelledAt: r.CANCELLED_AT,
        })),
        total: countResult.rows?.[0]?.CNT || 0,
        stats,
      };
    });
  });

  // PATCH /api/enrollments/:id/confirm — admin manual confirm
  app.patch("/api/enrollments/:id/confirm", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT id, status, name, email, activity_id FROM enrollments WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const enrollment = result.rows?.[0];
      if (!enrollment) {
        return reply.code(404).send({ error: "Inscripción no encontrada" });
      }
      if (enrollment.STATUS === "CONFIRMED") {
        return { ok: true }; // Already confirmed
      }

      await conn.execute(
        `UPDATE enrollments SET status = 'CONFIRMED', confirmed_at = SYSTIMESTAMP WHERE id = :id`,
        { id }
      );

      try {
        const actResult = await conn.execute<any>(
          `SELECT title FROM activities WHERE id = :id`,
          { id: enrollment.ACTIVITY_ID },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await sendEnrollmentResultEmail(
          enrollment.EMAIL, enrollment.NAME,
          actResult.rows?.[0]?.TITLE || "",
          "CONFIRMED"
        );
      } catch (err) {
        console.error("Error sending confirmation email:", err);
      }

      return { ok: true };
    });
  });

  // POST /api/activities/:id/enrollments/lottery — run lottery
  app.post("/api/activities/:id/enrollments/lottery", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Verify activity is LOTTERY mode
      const actResult = await conn.execute<any>(
        `SELECT enrollment_mode, max_capacity, title FROM activities WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const activity = actResult.rows?.[0];
      if (!activity || activity.ENROLLMENT_MODE !== "LOTTERY") {
        return reply.code(400).send({ error: "Esta actividad no está en modo sorteo" });
      }

      // Get all PENDING enrollments
      const pendingResult = await conn.execute<any>(
        `SELECT id, name, email FROM enrollments
         WHERE activity_id = :id AND status = 'PENDING'
         ORDER BY position`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const pending = pendingResult.rows || [];

      if (pending.length === 0) {
        return reply.code(400).send({ error: "No hay inscripciones pendientes" });
      }

      // Fisher-Yates shuffle
      const shuffled = [...pending];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const capacity = activity.MAX_CAPACITY || shuffled.length;
      let confirmed = 0;
      let waitlisted = 0;

      for (let i = 0; i < shuffled.length; i++) {
        const newStatus = i < capacity ? "CONFIRMED" : "WAITLISTED";
        await conn.execute(
          `UPDATE enrollments SET status = :status, position = :pos,
                  confirmed_at = CASE WHEN :status2 = 'CONFIRMED' THEN SYSTIMESTAMP ELSE NULL END
           WHERE id = :id`,
          { status: newStatus, pos: i + 1, status2: newStatus, id: shuffled[i].ID }
        );

        if (newStatus === "CONFIRMED") confirmed++;
        else waitlisted++;

        // Send result email
        try {
          await sendEnrollmentResultEmail(
            shuffled[i].EMAIL, shuffled[i].NAME,
            activity.TITLE, newStatus
          );
        } catch (err) {
          console.error("Error sending lottery result email:", err);
        }
      }

      return { confirmed, waitlisted };
    });
  });
}
