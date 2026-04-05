import { FastifyInstance } from "fastify";
import { readFile } from "fs/promises";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import oracledb from "oracledb";
import archiver from "archiver";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getEmbedding, buildActivityText } from "../lib/ai.js";
import { logActivity } from "../lib/audit.js";
import { checkPlanLimit, PlanLimitError } from "../lib/plan-limits.js";
import { trackAiUsage } from "../lib/ai-usage.js";

async function updateActivityEmbedding(
  id: string, tenantId: number, userId: string,
  title: string, description?: string | null, type?: string, location?: string | null,
  startDate?: string | Date | null, status?: string | null, priority?: string | null
) {
  const text = buildActivityText(title, description, type, location, startDate, status, priority);
  const embResult = await getEmbedding(text);
  if (!embResult) return;
  trackAiUsage({ tenantId, userId, callType: "EMBEDDING", model: "cohere-embed-v3", inputChars: embResult.usage.inputChars });
  await withTenant(tenantId, userId, async (conn) => {
    await conn.execute(
      `UPDATE activities SET embedding = :emb WHERE id = :id`,
      { emb: { val: new Float32Array(embResult.embedding), type: oracledb.DB_TYPE_VECTOR }, id }
    );
  });
}

export async function activityRoutes(app: FastifyInstance) {
  // GET /api/activities
  app.get("/api/activities", { preHandler: [requireAuth] }, async (request) => {
    const { userId, participantId, type, excludeTypes, status, from, to, page, limit, enrollmentEnabled } =
      request.query as {
        userId?: string;
        participantId?: string;
        type?: string;
        excludeTypes?: string;
        status?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
        enrollmentEnabled?: string;
      };

    const pageNum = parseInt(page || "1");
    const limitNum = parseInt(limit || "20");
    const offset = (pageNum - 1) * limitNum;

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      let whereClause = "WHERE 1=1";
      const countBinds: any = {};
      const listBinds: any = { limitNum, offset };

      if (enrollmentEnabled === "1") {
        whereClause += " AND a.enrollment_enabled = 1";
      } else if (enrollmentEnabled === "0") {
        whereClause += " AND (a.enrollment_enabled = 0 OR a.enrollment_enabled IS NULL)";
      }

      if (userId) {
        whereClause += " AND a.owner_id = :userId";
        countBinds.userId = userId;
        listBinds.userId = userId;
      }

      if (participantId) {
        whereClause +=
          " AND (a.owner_id = :participantId OR EXISTS (SELECT 1 FROM activity_attendees aa WHERE aa.activity_id = a.id AND aa.user_id = :participantId))";
        countBinds.participantId = participantId;
        listBinds.participantId = participantId;
      }

      if (type) {
        whereClause += " AND a.type = :type";
        countBinds.type = type;
        listBinds.type = type;
      }

      if (excludeTypes) {
        const excluded = excludeTypes.split(",").map(t => t.trim()).filter(Boolean);
        excluded.forEach((t, i) => {
          const key = `excType${i}`;
          whereClause += ` AND a.type != :${key}`;
          countBinds[key] = t;
          listBinds[key] = t;
        });
      }

      if (status) {
        whereClause += " AND a.status = :status";
        countBinds.status = status;
        listBinds.status = status;
      }

      if (from) {
        whereClause += " AND a.start_date >= TO_TIMESTAMP(:fromDate, 'YYYY-MM-DD')";
        countBinds.fromDate = from;
        listBinds.fromDate = from;
      }

      if (to) {
        whereClause += " AND a.start_date <= TO_TIMESTAMP(:toDate, 'YYYY-MM-DD')";
        countBinds.toDate = to;
        listBinds.toDate = to;
      }

      const countResult = await conn.execute<any>(
        `SELECT COUNT(*) AS total FROM activities a ${whereClause}`,
        countBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const total = countResult.rows?.[0]?.TOTAL || 0;

      const result = await conn.execute<any>(
        `SELECT a.id, a.title, a.description, a.type, a.status, a.priority,
                a.start_date, a.location, a.visibility, a.owner_id, a.created_by,
                a.created_at, a.updated_at,
                a.enrollment_enabled, a.enrollment_mode, a.max_capacity,
                a.enrollment_price, a.enrollment_deadline,
                a.publish_status, a.publish_date,
                u.name AS owner_name,
                (SELECT COUNT(*) FROM enrollments e WHERE e.activity_id = a.id AND e.status IN ('CONFIRMED', 'PENDING')) AS enrollment_count
         FROM activities a
         LEFT JOIN users u ON u.id = a.owner_id
         ${whereClause}
         ORDER BY a.created_at DESC
         OFFSET :offset ROWS FETCH NEXT :limitNum ROWS ONLY`,
        listBinds,
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const activities = [];
      for (const row of result.rows || []) {
        // Get attendees
        const attResult = await conn.execute<any>(
          `SELECT u.id, u.name FROM activity_attendees aa JOIN users u ON u.id = aa.user_id WHERE aa.activity_id = :actId`,
          { actId: row.ID },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Get tags
        const tagResult = await conn.execute<any>(
          `SELECT t.id, t.name, t.color FROM activity_tags at2 JOIN tags t ON t.id = at2.tag_id WHERE at2.activity_id = :actId`,
          { actId: row.ID },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Get sessions
        const sessResult = await conn.execute<any>(
          `SELECT session_num, session_date, time_start, time_end, title
           FROM course_sessions WHERE activity_id = :actId ORDER BY session_num`,
          { actId: row.ID },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        activities.push({
          id: row.ID,
          title: row.TITLE,
          description: row.DESCRIPTION,
          type: row.TYPE,
          status: row.STATUS,
          priority: row.PRIORITY,
          startDate: row.START_DATE,
          location: row.LOCATION,
          visibility: row.VISIBILITY,
          ownerId: row.OWNER_ID,
          ownerName: row.OWNER_NAME,
          createdBy: row.CREATED_BY,
          createdAt: row.CREATED_AT,
          updatedAt: row.UPDATED_AT,
          enrollmentEnabled: !!row.ENROLLMENT_ENABLED,
          enrollmentMode: row.ENROLLMENT_MODE,
          maxCapacity: row.MAX_CAPACITY,
          enrollmentPrice: row.ENROLLMENT_PRICE,
          enrollmentDeadline: row.ENROLLMENT_DEADLINE,
          enrollmentCount: row.ENROLLMENT_COUNT,
          publishStatus: row.PUBLISH_STATUS || "PUBLISHED",
          publishDate: row.PUBLISH_DATE,
          attendees: (attResult.rows || []).map((a: any) => ({
            id: a.ID,
            name: a.NAME,
          })),
          tags: (tagResult.rows || []).map((t: any) => ({
            id: t.ID,
            name: t.NAME,
            color: t.COLOR,
          })),
          sessions: (sessResult.rows || []).map((s: any) => ({
            sessionDate: s.SESSION_DATE,
            timeStart: s.TIME_START,
            timeEnd: s.TIME_END,
            title: s.TITLE,
          })),
        });
      }

      return { activities, total, page: pageNum, limit: limitNum };
    });
  });

  // POST /api/activities
  app.post("/api/activities", { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      title, description, type, status, priority,
      startDate, location, visibility, ownerId,
      attendeeIds, tagIds, contactIds, spaceId,
      enrollmentEnabled, enrollmentMode, maxCapacity, enrollmentPrice, enrollmentDeadline,
      publishStatus, publishDate, programText,
      instructorType, instructorId, sessions,
    } = request.body as {
      title?: string;
      description?: string;
      type?: string;
      status?: string;
      priority?: string;
      startDate?: string;
      location?: string;
      visibility?: string;
      ownerId?: string;
      attendeeIds?: string[];
      tagIds?: string[];
      contactIds?: Array<{ id: string; role?: string }>;
      spaceId?: string;
      enrollmentEnabled?: boolean;
      enrollmentMode?: string;
      maxCapacity?: number;
      enrollmentPrice?: number;
      enrollmentDeadline?: string;
      publishStatus?: string;
      publishDate?: string;
      programText?: string;
      instructorType?: string;
      instructorId?: string;
      sessions?: Array<{ sessionDate?: string; timeStart?: string; timeEnd?: string; title?: string; content?: string }>;
    };

    if (!title || title.trim().length === 0) {
      return reply.code(400).send({ error: "El título es obligatorio" });
    }

    try {
    return await withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await checkPlanLimit(conn, request.user.tenantId, "activities");
      const id = crypto.randomUUID();

      // If spaceId provided, resolve space name as location
      let resolvedLocation = location || null;
      if (spaceId) {
        const spaceResult = await conn.execute<any>(
          `SELECT name FROM spaces WHERE id = :spaceId`,
          { spaceId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (spaceResult.rows?.length) {
          resolvedLocation = spaceResult.rows[0].NAME;
        }
      }

      await conn.execute(
        `INSERT INTO activities (id, tenant_id, title, description, type, status, priority, start_date, location, visibility, owner_id, created_by,
         enrollment_enabled, enrollment_mode, max_capacity, enrollment_price, enrollment_deadline,
         publish_status, publish_date, program_text, instructor_type, instructor_id)
         VALUES (:id, :tenantId, :title, :description, :type, :status, :priority, :startDate, :location, :visibility, :ownerId, :createdBy,
         :enrollmentEnabled, :enrollmentMode, :maxCapacity, :enrollmentPrice, :enrollmentDeadline,
         :publishStatus, :publishDate, :programText, :instructorType, :instructorId)`,
        {
          id,
          tenantId: request.user.tenantId,
          title: title.trim(),
          description: description || null,
          type: type || "TASK",
          status: status || "PENDING",
          priority: priority || "MEDIUM",
          startDate: startDate ? new Date(startDate) : null,
          location: resolvedLocation,
          visibility: visibility || "GENERAL",
          ownerId: ownerId || request.user.id,
          createdBy: request.user.id,
          enrollmentEnabled: enrollmentEnabled ? 1 : 0,
          enrollmentMode: enrollmentMode || "FIFO",
          maxCapacity: maxCapacity || null,
          enrollmentPrice: enrollmentPrice || 0,
          enrollmentDeadline: enrollmentDeadline ? new Date(enrollmentDeadline) : null,
          publishStatus: publishStatus || "PUBLISHED",
          publishDate: publishDate ? new Date(publishDate) : null,
          programText: programText || null,
          instructorType: instructorType || null,
          instructorId: instructorId || null,
        }
      );

      // Insert sessions if provided
      if (sessions?.length) {
        for (let i = 0; i < sessions.length; i++) {
          const s = sessions[i];
          await conn.execute(
            `INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
             VALUES (:id, :tenantId, :actId, :num, :sDate, :tStart, :tEnd, :title, :content)`,
            {
              id: crypto.randomUUID(),
              tenantId: request.user.tenantId,
              actId: id,
              num: i + 1,
              sDate: s.sessionDate ? new Date(s.sessionDate) : null,
              tStart: s.timeStart || null,
              tEnd: s.timeEnd || null,
              title: s.title || null,
              content: s.content || null,
            }
          );
        }
      }

      // Auto-create booking if space selected and dates available
      if (spaceId && startDate) {
        const endDate = new Date(new Date(startDate).getTime() + 3600000).toISOString().slice(0, 16); // +1h default
        const bookingId = crypto.randomUUID();
        try {
          await conn.execute(
            `INSERT INTO bookings (id, tenant_id, space_id, title, start_date, end_date, activity_id, booked_by)
             VALUES (:id, :tenantId, :spaceId, :title,
                     TO_TIMESTAMP(:startDate, 'YYYY-MM-DD"T"HH24:MI'),
                     TO_TIMESTAMP(:endDate, 'YYYY-MM-DD"T"HH24:MI'),
                     :activityId, :bookedBy)`,
            {
              id: bookingId,
              tenantId: request.user.tenantId,
              spaceId,
              title: title.trim(),
              startDate,
              endDate,
              activityId: id,
              bookedBy: request.user.id,
            }
          );
        } catch {
          // Booking creation is best-effort — don't fail the activity
        }
      }

      // Add attendees
      if (attendeeIds?.length) {
        for (const userId of attendeeIds) {
          await conn.execute(
            `INSERT INTO activity_attendees (activity_id, user_id) VALUES (:actId, :userId)`,
            { actId: id, userId }
          );
        }
      }

      // Add tags
      if (tagIds?.length) {
        for (const tagId of tagIds) {
          await conn.execute(
            `INSERT INTO activity_tags (activity_id, tag_id) VALUES (:actId, :tagId)`,
            { actId: id, tagId }
          );
        }
      }

      // Add contacts
      if (contactIds?.length) {
        for (const c of contactIds) {
          await conn.execute(
            `INSERT INTO activity_contacts (activity_id, contact_id, role) VALUES (:actId, :contactId, :role)`,
            { actId: id, contactId: c.id, role: c.role || null }
          );
        }
      }

      // Audit log
      await logActivity(conn, request.user.tenantId, id, request.user.id, request.user.name, "CREATED", `Creo la actividad "${title.trim()}"`);

      // Fire-and-forget embedding generation
      updateActivityEmbedding(id, request.user.tenantId, request.user.id, title.trim(), description, type || "TASK", resolvedLocation, startDate, status || "PENDING", priority || "MEDIUM")
        .catch(err => console.warn("Activity embedding failed:", err));

      return reply.code(201).send({
        id,
        title: title.trim(),
        type: type || "TASK",
        status: status || "PENDING",
        priority: priority || "MEDIUM",
      });
    });
    } catch (err: any) {
      if (err instanceof PlanLimitError) return reply.code(403).send({ error: err.message });
      throw err;
    }
  });

  // GET /api/activities/:id
  app.get("/api/activities/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT a.id, a.title, a.description, a.type, a.status, a.priority,
                a.start_date, a.location, a.visibility, a.owner_id, a.created_by,
                a.created_at, a.updated_at,
                a.enrollment_enabled, a.enrollment_mode, a.max_capacity,
                a.enrollment_price, a.enrollment_deadline,
                a.publish_status, a.publish_date, a.program_text,
                a.instructor_type, a.instructor_id, a.cover_image_path,
                u.name AS owner_name,
                cb.name AS created_by_name,
                (SELECT COUNT(*) FROM enrollments e WHERE e.activity_id = a.id AND e.status IN ('CONFIRMED', 'PENDING')) AS enrollment_count
         FROM activities a
         LEFT JOIN users u ON u.id = a.owner_id
         LEFT JOIN users cb ON cb.id = a.created_by
         WHERE a.id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const activity = result.rows?.[0];
      if (!activity) {
        return reply.code(404).send({ error: "Actividad no encontrada" });
      }

      // Attendees
      const attResult = await conn.execute<any>(
        `SELECT u.id, u.name, u.email FROM activity_attendees aa JOIN users u ON u.id = aa.user_id WHERE aa.activity_id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Tags
      const tagResult = await conn.execute<any>(
        `SELECT t.id, t.name, t.color FROM activity_tags at2 JOIN tags t ON t.id = at2.tag_id WHERE at2.activity_id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Documents
      const docResult = await conn.execute<any>(
        `SELECT d.id, d.title, d.file_name, d.file_type, d.file_size
         FROM document_activities da JOIN documents d ON d.id = da.document_id
         WHERE da.activity_id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Contacts
      const contactResult = await conn.execute<any>(
        `SELECT c.id, c.name, c.phone, c.email, c.category, ac.role
         FROM activity_contacts ac JOIN contacts c ON c.id = ac.contact_id
         WHERE ac.activity_id = :id
         ORDER BY c.name`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Albums
      const albumResult = await conn.execute<any>(
        `SELECT al.id, al.title, al.description,
                (SELECT COUNT(*) FROM photos p WHERE p.album_id = al.id) AS photo_count
         FROM album_activities aa JOIN albums al ON al.id = aa.album_id
         WHERE aa.activity_id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Resolve instructor name
      let instructorName: string | null = null;
      if (activity.INSTRUCTOR_ID) {
        if (activity.INSTRUCTOR_TYPE === "MEMBER") {
          const ir = await conn.execute<any>(`SELECT name FROM users WHERE id = :id`, { id: activity.INSTRUCTOR_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
          instructorName = ir.rows?.[0]?.NAME || null;
        } else if (activity.INSTRUCTOR_TYPE === "CONTACT") {
          const ir = await conn.execute<any>(`SELECT name FROM contacts WHERE id = :id`, { id: activity.INSTRUCTOR_ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
          instructorName = ir.rows?.[0]?.NAME || null;
        }
      }

      // Fetch sessions
      const sessionsResult = await conn.execute<any>(
        `SELECT id, session_num, session_date, time_start, time_end, title, content
         FROM course_sessions WHERE activity_id = :id ORDER BY session_num`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return {
        id: activity.ID,
        title: activity.TITLE,
        description: activity.DESCRIPTION,
        type: activity.TYPE,
        status: activity.STATUS,
        priority: activity.PRIORITY,
        startDate: activity.START_DATE,
        location: activity.LOCATION,
        visibility: activity.VISIBILITY,
        ownerId: activity.OWNER_ID,
        ownerName: activity.OWNER_NAME,
        createdBy: activity.CREATED_BY,
        createdByName: activity.CREATED_BY_NAME,
        createdAt: activity.CREATED_AT,
        updatedAt: activity.UPDATED_AT,
        enrollmentEnabled: !!activity.ENROLLMENT_ENABLED,
        enrollmentMode: activity.ENROLLMENT_MODE,
        maxCapacity: activity.MAX_CAPACITY,
        enrollmentPrice: activity.ENROLLMENT_PRICE,
        enrollmentDeadline: activity.ENROLLMENT_DEADLINE,
        enrollmentCount: activity.ENROLLMENT_COUNT,
        publishStatus: activity.PUBLISH_STATUS || "PUBLISHED",
        publishDate: activity.PUBLISH_DATE,
        programText: activity.PROGRAM_TEXT,
        instructor: activity.INSTRUCTOR_ID ? {
          type: activity.INSTRUCTOR_TYPE,
          id: activity.INSTRUCTOR_ID,
          name: instructorName,
        } : null,
        coverImagePath: activity.COVER_IMAGE_PATH,
        sessions: (sessionsResult.rows || []).map((s: any) => ({
          id: s.ID,
          sessionNum: s.SESSION_NUM,
          sessionDate: s.SESSION_DATE,
          timeStart: s.TIME_START,
          timeEnd: s.TIME_END,
          title: s.TITLE,
          content: s.CONTENT,
        })),
        attendees: (attResult.rows || []).map((a: any) => ({
          id: a.ID,
          name: a.NAME,
          email: a.EMAIL,
        })),
        tags: (tagResult.rows || []).map((t: any) => ({
          id: t.ID,
          name: t.NAME,
          color: t.COLOR,
        })),
        documents: (docResult.rows || []).map((d: any) => ({
          id: d.ID,
          title: d.TITLE,
          fileName: d.FILE_NAME,
          fileType: d.FILE_TYPE,
          fileSize: d.FILE_SIZE,
        })),
        contacts: (contactResult.rows || []).map((c: any) => ({
          id: c.ID,
          name: c.NAME,
          phone: c.PHONE,
          email: c.EMAIL,
          category: c.CATEGORY,
          role: c.ROLE,
        })),
        albums: (albumResult.rows || []).map((al: any) => ({
          id: al.ID,
          title: al.TITLE,
          description: al.DESCRIPTION,
          photoCount: al.PHOTO_COUNT,
        })),
        timeline: [],
      };

      // Get audit log
      const logResult = await conn.execute<any>(
        `SELECT id, user_name, action, detail, created_at
         FROM activity_log
         WHERE activity_id = :id
         ORDER BY created_at ASC`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      response.timeline = (logResult.rows || []).map((row: any) => ({
        id: row.ID,
        userName: row.USER_NAME,
        action: row.ACTION,
        detail: row.DETAIL,
        createdAt: row.CREATED_AT,
      }));

      return response;
    });
  });

  // PUT /api/activities/:id
  app.put("/api/activities/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const {
      title, description, type, status, priority,
      startDate, location, visibility, ownerId,
      attendeeIds, tagIds, contactIds, spaceId,
      enrollmentEnabled, enrollmentMode, maxCapacity, enrollmentPrice, enrollmentDeadline,
      publishStatus, publishDate, programText,
      instructorType, instructorId, sessions,
    } = request.body as {
      title?: string;
      description?: string;
      type?: string;
      status?: string;
      priority?: string;
      startDate?: string;
      location?: string;
      visibility?: string;
      ownerId?: string;
      attendeeIds?: string[];
      tagIds?: string[];
      contactIds?: Array<{ id: string; role?: string }>;
      spaceId?: string;
      enrollmentEnabled?: boolean;
      enrollmentMode?: string;
      maxCapacity?: number;
      enrollmentPrice?: number;
      enrollmentDeadline?: string;
      publishStatus?: string;
      publishDate?: string;
      programText?: string;
      instructorType?: string;
      instructorId?: string;
      sessions?: Array<{ sessionDate?: string; timeStart?: string; timeEnd?: string; title?: string; content?: string }>;
    };

    if (!title || title.trim().length === 0) {
      return reply.code(400).send({ error: "El título es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id FROM activities WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Actividad no encontrada" });
      }

      // If spaceId provided, resolve space name as location
      let resolvedLocation = location || null;
      if (spaceId) {
        const spaceResult = await conn.execute<any>(
          `SELECT name FROM spaces WHERE id = :spaceId`,
          { spaceId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (spaceResult.rows?.length) {
          resolvedLocation = spaceResult.rows[0].NAME;
        }
      }

      await conn.execute(
        `UPDATE activities SET title = :title, description = :description, type = :type,
                status = :status, priority = :priority, start_date = :startDate,
                location = :location, visibility = :visibility, owner_id = :ownerId,
                enrollment_enabled = :enrollmentEnabled, enrollment_mode = :enrollmentMode,
                max_capacity = :maxCapacity, enrollment_price = :enrollmentPrice,
                enrollment_deadline = :enrollmentDeadline,
                publish_status = :publishStatus, publish_date = :publishDate,
                program_text = :programText, instructor_type = :instructorType,
                instructor_id = :instructorId, updated_at = SYSTIMESTAMP
         WHERE id = :id`,
        {
          id,
          title: title.trim(),
          description: description || null,
          type: type || "TASK",
          status: status || "PENDING",
          priority: priority || "MEDIUM",
          startDate: startDate ? new Date(startDate) : null,
          location: resolvedLocation,
          visibility: visibility || "GENERAL",
          ownerId: ownerId || request.user.id,
          enrollmentEnabled: enrollmentEnabled ? 1 : 0,
          enrollmentMode: enrollmentMode || "FIFO",
          maxCapacity: maxCapacity || null,
          enrollmentPrice: enrollmentPrice || 0,
          enrollmentDeadline: enrollmentDeadline ? new Date(enrollmentDeadline) : null,
          publishStatus: publishStatus || "PUBLISHED",
          publishDate: publishDate ? new Date(publishDate) : null,
          programText: programText || null,
          instructorType: instructorType || null,
          instructorId: instructorId || null,
        }
      );

      // Replace sessions
      await conn.execute(`DELETE FROM course_sessions WHERE activity_id = :id`, { id });
      if (sessions?.length) {
        for (let i = 0; i < sessions.length; i++) {
          const s = sessions[i];
          await conn.execute(
            `INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
             VALUES (:id, :tenantId, :actId, :num, :sDate, :tStart, :tEnd, :title, :content)`,
            {
              id: crypto.randomUUID(),
              tenantId: request.user.tenantId,
              actId: id,
              num: i + 1,
              sDate: s.sessionDate ? new Date(s.sessionDate) : null,
              tStart: s.timeStart || null,
              tEnd: s.timeEnd || null,
              title: s.title || null,
              content: s.content || null,
            }
          );
        }
      }

      // Replace attendees
      await conn.execute(`DELETE FROM activity_attendees WHERE activity_id = :id`, { id });
      if (attendeeIds?.length) {
        for (const userId of attendeeIds) {
          await conn.execute(
            `INSERT INTO activity_attendees (activity_id, user_id) VALUES (:actId, :userId)`,
            { actId: id, userId }
          );
        }
      }

      // Replace tags
      await conn.execute(`DELETE FROM activity_tags WHERE activity_id = :id`, { id });
      if (tagIds?.length) {
        for (const tagId of tagIds) {
          await conn.execute(
            `INSERT INTO activity_tags (activity_id, tag_id) VALUES (:actId, :tagId)`,
            { actId: id, tagId }
          );
        }
      }

      // Replace contacts
      await conn.execute(`DELETE FROM activity_contacts WHERE activity_id = :id`, { id });
      if (contactIds?.length) {
        for (const c of contactIds) {
          await conn.execute(
            `INSERT INTO activity_contacts (activity_id, contact_id, role) VALUES (:actId, :contactId, :role)`,
            { actId: id, contactId: c.id, role: c.role || null }
          );
        }
      }

      // Audit log
      await logActivity(conn, request.user.tenantId, id, request.user.id, request.user.name, "UPDATED", "Actualizo la actividad");

      // Fire-and-forget embedding update
      updateActivityEmbedding(id, request.user.tenantId, request.user.id, title.trim(), description, type, resolvedLocation, startDate, status, priority)
        .catch(err => console.warn("Activity embedding update failed:", err));

      return { id, title: title.trim(), status: status || "PENDING" };
    });
  });

  // PATCH /api/activities/:id/status — quick status update (Kanban)
  app.patch("/api/activities/:id/status", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const taskStatuses = ["PENDING", "IN_PROGRESS", "DONE"];
    const activityStatuses = ["DRAFT", "IN_REVIEW", "PUBLISHED", "FINISHED", "ARCHIVED"];
    const allValid = [...taskStatuses, ...activityStatuses];
    if (!allValid.includes(status)) {
      return reply.code(400).send({ error: `Estado inválido. Valores: ${allValid.join(", ")}` });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Also update publish_status for backwards compatibility
      const publishStatus = ["PUBLISHED", "FINISHED", "ARCHIVED"].includes(status) ? "PUBLISHED" : ["DRAFT", "IN_REVIEW"].includes(status) ? "DRAFT" : undefined;
      const updateSql = publishStatus
        ? `UPDATE activities SET status = :status, publish_status = :publishStatus, updated_at = SYSTIMESTAMP WHERE id = :id`
        : `UPDATE activities SET status = :status, updated_at = SYSTIMESTAMP WHERE id = :id`;
      const binds = publishStatus ? { status, publishStatus, id } : { status, id };
      const result = await conn.execute<any>(updateSql, binds);

      if (result.rowsAffected === 0) {
        return reply.code(404).send({ error: "Actividad no encontrada" });
      }

      const statusLabels: Record<string, string> = {
        PENDING: "Pendiente", IN_PROGRESS: "En Progreso", DONE: "Hecho",
        DRAFT: "Borrador", IN_REVIEW: "En revisión", PUBLISHED: "Publicado",
        FINISHED: "Finalizado", ARCHIVED: "Archivado",
      };
      await logActivity(conn, request.user.tenantId, id, request.user.id, request.user.name, "STATUS_CHANGED", `Cambio estado a "${statusLabels[status] || status}"`);

      return { id, status };
    });
  });

  // DELETE /api/activities/:id
  app.delete("/api/activities/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Check exists and authorization
      const check = await conn.execute<any>(
        `SELECT id, created_by FROM activities WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Actividad no encontrada" });
      }

      const activity = check.rows[0];
      if (request.user.role !== "ADMIN" && activity.CREATED_BY !== request.user.id) {
        return reply.code(403).send({ error: "No autorizado" });
      }

      // Cascade deletes handle junction tables (activity_attendees, activity_tags, document_activities, album_activities)
      await conn.execute(`DELETE FROM activities WHERE id = :id`, { id });

      return { ok: true };
    });
  });

  // POST /api/activities/:id/attend — self-register
  app.post("/api/activities/:id/attend", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id FROM activities WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Actividad no encontrada" });
      }

      try {
        await conn.execute(
          `INSERT INTO activity_attendees (activity_id, user_id) VALUES (:actId, :userId)`,
          { actId: id, userId: request.user.id }
        );
      } catch (err: any) {
        if (err.errorNum === 1) {
          return reply.code(409).send({ error: "Ya estás apuntado/a a esta actividad" });
        }
        throw err;
      }

      await logActivity(conn, request.user.tenantId, id, request.user.id, request.user.name, "JOINED", `${request.user.name} se apunto`);

      return reply.code(201).send({ ok: true });
    });
  });

  // DELETE /api/activities/:id/attend — unregister
  app.delete("/api/activities/:id/attend", { preHandler: [requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await conn.execute(
        `DELETE FROM activity_attendees WHERE activity_id = :actId AND user_id = :userId`,
        { actId: id, userId: request.user.id }
      );

      await logActivity(conn, request.user.tenantId, id, request.user.id, request.user.name, "LEFT", `${request.user.name} se desapunto`);

      return { ok: true };
    });
  });

  // POST /api/activities/:id/attendees — add a member as attendee
  app.post("/api/activities/:id/attendees", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { userId } = request.body as { userId: string };

    if (!userId) {
      return reply.code(400).send({ error: "userId es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id FROM activities WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Actividad no encontrada" });
      }

      try {
        await conn.execute(
          `INSERT INTO activity_attendees (activity_id, user_id) VALUES (:actId, :userId)`,
          { actId: id, userId }
        );
      } catch (err: any) {
        if (err.errorNum === 1) {
          return reply.code(409).send({ error: "Este miembro ya es participante" });
        }
        throw err;
      }

      // Get added user name
      const userResult = await conn.execute<any>(`SELECT name FROM users WHERE id = :userId`, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const addedName = userResult.rows?.[0]?.NAME || "Usuario";
      await logActivity(conn, request.user.tenantId, id, request.user.id, request.user.name, "MEMBER_ADDED", `Anadio a ${addedName}`);

      return reply.code(201).send({ ok: true });
    });
  });

  // DELETE /api/activities/:id/attendees/:userId — remove member as attendee
  app.delete("/api/activities/:id/attendees/:userId", { preHandler: [requireAuth] }, async (request) => {
    const { id, userId } = request.params as { id: string; userId: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await conn.execute(
        `DELETE FROM activity_attendees WHERE activity_id = :actId AND user_id = :userId`,
        { actId: id, userId }
      );
      return { ok: true };
    });
  });

  // POST /api/activities/:id/documents — attach document
  app.post("/api/activities/:id/documents", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { documentId } = request.body as { documentId: string };

    if (!documentId) {
      return reply.code(400).send({ error: "documentId es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id FROM activities WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Actividad no encontrada" });
      }

      try {
        await conn.execute(
          `INSERT INTO document_activities (document_id, activity_id) VALUES (:documentId, :actId)`,
          { documentId, actId: id }
        );
      } catch (err: any) {
        if (err.errorNum === 1) {
          return reply.code(409).send({ error: "Documento ya adjuntado" });
        }
        throw err;
      }

      const docResult = await conn.execute<any>(`SELECT title FROM documents WHERE id = :documentId`, { documentId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const docTitle = docResult.rows?.[0]?.TITLE || "documento";
      await logActivity(conn, request.user.tenantId, id, request.user.id, request.user.name, "DOC_ATTACHED", `Adjunto "${docTitle}"`);

      return reply.code(201).send({ ok: true });
    });
  });

  // DELETE /api/activities/:id/documents/:documentId — detach document
  app.delete("/api/activities/:id/documents/:documentId", { preHandler: [requireAuth] }, async (request) => {
    const { id, documentId } = request.params as { id: string; documentId: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await conn.execute(
        `DELETE FROM document_activities WHERE document_id = :documentId AND activity_id = :actId`,
        { documentId, actId: id }
      );
      return { ok: true };
    });
  });

  // POST /api/activities/:id/albums — attach album
  app.post("/api/activities/:id/albums", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { albumId } = request.body as { albumId: string };

    if (!albumId) {
      return reply.code(400).send({ error: "albumId es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id FROM activities WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Actividad no encontrada" });
      }

      try {
        await conn.execute(
          `INSERT INTO album_activities (album_id, activity_id) VALUES (:albumId, :actId)`,
          { albumId, actId: id }
        );
      } catch (err: any) {
        if (err.errorNum === 1) {
          return reply.code(409).send({ error: "Álbum ya vinculado" });
        }
        throw err;
      }

      const albResult = await conn.execute<any>(`SELECT title FROM albums WHERE id = :albumId`, { albumId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const albTitle = albResult.rows?.[0]?.TITLE || "album";
      await logActivity(conn, request.user.tenantId, id, request.user.id, request.user.name, "ALBUM_ATTACHED", `Vinculo album "${albTitle}"`);

      return reply.code(201).send({ ok: true });
    });
  });

  // DELETE /api/activities/:id/albums/:albumId — detach album
  app.delete("/api/activities/:id/albums/:albumId", { preHandler: [requireAuth] }, async (request) => {
    const { id, albumId } = request.params as { id: string; albumId: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await conn.execute(
        `DELETE FROM album_activities WHERE album_id = :albumId AND activity_id = :actId`,
        { albumId, actId: id }
      );
      return { ok: true };
    });
  });

  // POST /api/activities/:id/contacts — attach contact
  app.post("/api/activities/:id/contacts", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { contactId, role } = request.body as { contactId: string; role?: string };

    if (!contactId) {
      return reply.code(400).send({ error: "contactId es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const check = await conn.execute<any>(
        `SELECT id FROM activities WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!check.rows?.length) {
        return reply.code(404).send({ error: "Actividad no encontrada" });
      }

      try {
        await conn.execute(
          `INSERT INTO activity_contacts (activity_id, contact_id, role) VALUES (:actId, :contactId, :role)`,
          { actId: id, contactId, role: role || null }
        );
      } catch (err: any) {
        if (err.errorNum === 1) {
          return reply.code(409).send({ error: "Contacto ya vinculado" });
        }
        throw err;
      }

      return reply.code(201).send({ ok: true });
    });
  });

  // DELETE /api/activities/:id/contacts/:contactId — detach contact
  app.delete("/api/activities/:id/contacts/:contactId", { preHandler: [requireAuth] }, async (request) => {
    const { id, contactId } = request.params as { id: string; contactId: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await conn.execute(
        `DELETE FROM activity_contacts WHERE activity_id = :actId AND contact_id = :contactId`,
        { actId: id, contactId }
      );
      return { ok: true };
    });
  });

  const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

  // POST /api/activities/:id/cover — upload cover image
  app.post("/api/activities/:id/cover", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: "Imagen requerida" });

    const buffer = await data.toBuffer();
    const ext = path.extname(data.filename) || ".jpg";
    const fileName = `${id}${ext}`;
    const coversDir = path.join(UPLOAD_DIR, "covers");
    const filePath = path.join(coversDir, fileName);

    await mkdir(coversDir, { recursive: true });
    await writeFile(filePath, buffer);

    await withTenant(request.user.tenantId, request.user.id, async (conn) => {
      await conn.execute(
        `UPDATE activities SET cover_image_path = :path, updated_at = SYSTIMESTAMP WHERE id = :id`,
        { path: filePath, id }
      );
    });

    return { ok: true, path: filePath };
  });

  // GET /api/activities/:id/cover — serve cover image
  app.get("/api/activities/:id/cover", async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await (await import("../lib/db.js")).withConnection(async (conn) => {
      const r = await conn.execute<any>(
        `SELECT cover_image_path FROM activities WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return r.rows?.[0]?.COVER_IMAGE_PATH;
    });

    if (!result) return reply.code(404).send({ error: "No cover image" });

    try {
      const buffer = await readFile(result);
      const ext = path.extname(result).toLowerCase();
      const types: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
      return reply.type(types[ext] || "image/jpeg").send(buffer);
    } catch {
      return reply.code(404).send({ error: "Image not found" });
    }
  });

  // POST /api/activities/:id/export-zip — export event as ZIP for grant justification
  app.post("/api/activities/:id/export-zip", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { includeSummary, includeAttendees, includeDocuments, includePhotos } =
      request.body as { includeSummary?: boolean; includeAttendees?: boolean; includeDocuments?: boolean; includePhotos?: boolean };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      // Fetch activity
      const actResult = await conn.execute<any>(
        `SELECT a.title, a.description, a.type, a.status, a.start_date, a.location,
                u.name AS owner_name
         FROM activities a LEFT JOIN users u ON u.id = a.owner_id WHERE a.id = :id`,
        { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const act = actResult.rows?.[0];
      if (!act) return reply.code(404).send({ error: "Evento no encontrado" });

      const safeTitle = act.TITLE.replace(/[^a-zA-Z0-9\s\-_áéíóúñÁÉÍÓÚÑ]/g, "").trim();

      reply.raw.setHeader("Content-Type", "application/zip");
      reply.raw.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.zip"`);

      const archive = archiver("zip", { zlib: { level: 5 } });
      archive.pipe(reply.raw);

      // 1. Summary text file
      if (includeSummary !== false) {
        const dateStr = act.START_DATE
          ? new Date(act.START_DATE).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
          : "Sin fecha";
        const lines = [
          `RESUMEN DEL EVENTO`,
          `==================`,
          ``,
          `Título: ${act.TITLE}`,
          `Tipo: ${act.TYPE}`,
          `Estado: ${act.STATUS}`,
          `Fecha: ${dateStr}`,
          `Lugar: ${act.LOCATION || "Sin definir"}`,
          `Responsable: ${act.OWNER_NAME || "Sin asignar"}`,
          ``,
        ];
        if (act.DESCRIPTION) {
          lines.push(`Descripción:`, act.DESCRIPTION, ``);
        }

        // Sessions
        const sessResult = await conn.execute<any>(
          `SELECT session_num, session_date, time_start, time_end, title, content
           FROM course_sessions WHERE activity_id = :id ORDER BY session_num`,
          { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (sessResult.rows?.length) {
          lines.push(`Sesiones (${sessResult.rows.length}):`, ``);
          for (const s of sessResult.rows) {
            const sDate = s.SESSION_DATE ? new Date(s.SESSION_DATE).toLocaleDateString("es-ES", { day: "numeric", month: "long" }) : "";
            lines.push(`  ${s.SESSION_NUM}. ${s.TITLE || "Sin título"} — ${sDate} ${s.TIME_START || ""}${s.TIME_END ? "–" + s.TIME_END : ""}`);
            if (s.CONTENT) lines.push(`     ${s.CONTENT}`);
          }
          lines.push(``);
        }

        archive.append("\uFEFF" + lines.join("\n"), { name: "resumen.txt" });
      }

      // 2. Attendees CSV
      if (includeAttendees !== false) {
        const attResult = await conn.execute<any>(
          `SELECT u.name, u.email, u.phone FROM activity_attendees aa JOIN users u ON u.id = aa.user_id WHERE aa.activity_id = :id ORDER BY u.name`,
          { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        // Also get enrolled participants
        const enrollResult = await conn.execute<any>(
          `SELECT name, email, phone, status FROM enrollments WHERE activity_id = :id AND status IN ('CONFIRMED', 'PENDING') ORDER BY name`,
          { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const csvLines = ["Nombre;Email;Teléfono;Tipo"];
        for (const a of attResult.rows || []) {
          csvLines.push(`${a.NAME};${a.EMAIL || ""};${a.PHONE || ""};Miembro`);
        }
        for (const e of enrollResult.rows || []) {
          csvLines.push(`${e.NAME};${e.EMAIL || ""};${e.PHONE || ""};Inscrito (${e.STATUS})`);
        }

        if (csvLines.length > 1) {
          // BOM + content for Excel UTF-8 compatibility
          archive.append("\uFEFF" + csvLines.join("\n"), { name: "asistentes.csv" });
        }
      }

      // 3. Linked documents
      if (includeDocuments !== false) {
        const docResult = await conn.execute<any>(
          `SELECT d.file_path, d.file_name FROM document_activities da JOIN documents d ON d.id = da.document_id WHERE da.activity_id = :id`,
          { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        for (const d of docResult.rows || []) {
          if (d.FILE_PATH && existsSync(d.FILE_PATH)) {
            archive.file(d.FILE_PATH, { name: `documentos/${d.FILE_NAME}` });
          }
        }
      }

      // 4. Photos from linked albums
      if (includePhotos !== false) {
        const albumResult = await conn.execute<any>(
          `SELECT a.id, a.title FROM album_activities aa JOIN albums a ON a.id = aa.album_id WHERE aa.activity_id = :id`,
          { id }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        for (const album of albumResult.rows || []) {
          const photoResult = await conn.execute<any>(
            `SELECT file_path, file_name FROM photos WHERE album_id = :albumId`,
            { albumId: album.ID }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          const albumFolder = album.TITLE.replace(/[^a-zA-Z0-9\s\-_áéíóúñÁÉÍÓÚÑ]/g, "").trim();
          for (const p of photoResult.rows || []) {
            if (p.FILE_PATH && existsSync(p.FILE_PATH)) {
              archive.file(p.FILE_PATH, { name: `fotos/${albumFolder}/${p.FILE_NAME}` });
            }
          }
        }
      }

      await archive.finalize();
      return reply;
    });
  });
}
