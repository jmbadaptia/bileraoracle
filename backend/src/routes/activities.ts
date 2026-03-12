import { FastifyInstance } from "fastify";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { getEmbedding, buildActivityText } from "../lib/ai.js";

async function updateActivityEmbedding(
  id: string, tenantId: number, userId: string,
  title: string, description?: string | null, type?: string, location?: string | null
) {
  const text = buildActivityText(title, description, type, location);
  const embedding = await getEmbedding(text);
  if (!embedding) return;
  await withTenant(tenantId, userId, async (conn) => {
    await conn.execute(
      `UPDATE activities SET embedding = :emb WHERE id = :id`,
      { emb: { val: new Float32Array(embedding), type: oracledb.DB_TYPE_VECTOR }, id }
    );
  });
}

export async function activityRoutes(app: FastifyInstance) {
  // GET /api/activities
  app.get("/api/activities", { preHandler: [requireAuth] }, async (request) => {
    const { userId, participantId, type, status, from, to, page, limit } =
      request.query as {
        userId?: string;
        participantId?: string;
        type?: string;
        status?: string;
        from?: string;
        to?: string;
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
                u.name AS owner_name
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
          attendees: (attResult.rows || []).map((a: any) => ({
            id: a.ID,
            name: a.NAME,
          })),
          tags: (tagResult.rows || []).map((t: any) => ({
            id: t.ID,
            name: t.NAME,
            color: t.COLOR,
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
      attendeeIds, tagIds, contactIds,
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
    };

    if (!title || title.trim().length === 0) {
      return reply.code(400).send({ error: "El título es obligatorio" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const id = crypto.randomUUID();

      await conn.execute(
        `INSERT INTO activities (id, tenant_id, title, description, type, status, priority, start_date, location, visibility, owner_id, created_by)
         VALUES (:id, :tenantId, :title, :description, :type, :status, :priority, :startDate, :location, :visibility, :ownerId, :createdBy)`,
        {
          id,
          tenantId: request.user.tenantId,
          title: title.trim(),
          description: description || null,
          type: type || "TASK",
          status: status || "PENDING",
          priority: priority || "MEDIUM",
          startDate: startDate ? new Date(startDate) : null,
          location: location || null,
          visibility: visibility || "GENERAL",
          ownerId: ownerId || request.user.id,
          createdBy: request.user.id,
        }
      );

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

      // Fire-and-forget embedding generation
      updateActivityEmbedding(id, request.user.tenantId, request.user.id, title.trim(), description, type, location)
        .catch(err => console.warn("Activity embedding failed:", err));

      return reply.code(201).send({
        id,
        title: title.trim(),
        type: type || "TASK",
        status: status || "PENDING",
        priority: priority || "MEDIUM",
      });
    });
  });

  // GET /api/activities/:id
  app.get("/api/activities/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `SELECT a.id, a.title, a.description, a.type, a.status, a.priority,
                a.start_date, a.location, a.visibility, a.owner_id, a.created_by,
                a.created_at, a.updated_at,
                u.name AS owner_name,
                cb.name AS created_by_name
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
      };
    });
  });

  // PUT /api/activities/:id
  app.put("/api/activities/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const {
      title, description, type, status, priority,
      startDate, location, visibility, ownerId,
      attendeeIds, tagIds, contactIds,
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

      await conn.execute(
        `UPDATE activities SET title = :title, description = :description, type = :type,
                status = :status, priority = :priority, start_date = :startDate,
                location = :location, visibility = :visibility, owner_id = :ownerId,
                updated_at = SYSTIMESTAMP
         WHERE id = :id`,
        {
          id,
          title: title.trim(),
          description: description || null,
          type: type || "TASK",
          status: status || "PENDING",
          priority: priority || "MEDIUM",
          startDate: startDate ? new Date(startDate) : null,
          location: location || null,
          visibility: visibility || "GENERAL",
          ownerId: ownerId || request.user.id,
        }
      );

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

      // Fire-and-forget embedding update
      updateActivityEmbedding(id, request.user.tenantId, request.user.id, title.trim(), description, type, location)
        .catch(err => console.warn("Activity embedding update failed:", err));

      return { id, title: title.trim(), status: status || "PENDING" };
    });
  });

  // PATCH /api/activities/:id/status — quick status update (Kanban)
  app.patch("/api/activities/:id/status", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const validStatuses = ["PENDING", "IN_PROGRESS", "DONE"];
    if (!validStatuses.includes(status)) {
      return reply.code(400).send({ error: "Estado inválido. Valores: PENDING, IN_PROGRESS, DONE" });
    }

    return withTenant(request.user.tenantId, request.user.id, async (conn) => {
      const result = await conn.execute<any>(
        `UPDATE activities SET status = :status, updated_at = SYSTIMESTAMP WHERE id = :id`,
        { status, id }
      );

      if (result.rowsAffected === 0) {
        return reply.code(404).send({ error: "Actividad no encontrada" });
      }

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
}
