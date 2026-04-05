import { FastifyInstance } from "fastify";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import oracledb from "oracledb";
import { withTenant } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { processDocument } from "../lib/processor.js";
import { checkPlanLimit, PlanLimitError } from "../lib/plan-limits.js";
import { encryptToken, decryptToken } from "../lib/crypto.js";
import { getCloudProvider, isValidProvider } from "../lib/cloud/registry.js";
import { CloudFile } from "../lib/cloud/types.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const APP_URL = process.env.APP_URL || "http://localhost:5173";

export async function cloudRoutes(app: FastifyInstance) {
  // GET /api/cloud/auth/:provider — redirect to OAuth consent screen
  app.get(
    "/api/cloud/auth/:provider",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { provider } = request.params as { provider: string };
      if (!isValidProvider(provider)) {
        return reply.code(400).send({ error: "Proveedor no soportado" });
      }

      const state = app.jwt.sign(
        {
          userId: request.user.id,
          tenantId: request.user.tenantId,
          provider,
        },
        { expiresIn: "10m" }
      );

      const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.protocol}://${request.hostname}/api/cloud/callback/${provider}`;
      const cloudProvider = getCloudProvider(provider);
      const authUrl = cloudProvider.getAuthUrl(state, redirectUri);

      return { authUrl };
    }
  );

  // GET /api/cloud/callback/:provider — OAuth callback (no auth middleware)
  app.get(
    "/api/cloud/callback/:provider",
    async (request, reply) => {
      const { provider } = request.params as { provider: string };
      const { code, state } = request.query as {
        code?: string;
        state?: string;
      };

      if (!code || !state) {
        return reply.redirect(`${APP_URL}/documentos/nube?error=missing_code`);
      }

      let decoded: { userId: string; tenantId: number; provider: string };
      try {
        decoded = app.jwt.verify<typeof decoded>(state);
      } catch {
        return reply.redirect(`${APP_URL}/documentos/nube?error=invalid_state`);
      }

      if (decoded.provider !== provider) {
        return reply.redirect(
          `${APP_URL}/documentos/nube?error=provider_mismatch`
        );
      }

      try {
        const cloudProvider = getCloudProvider(provider);
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.protocol}://${request.hostname}/api/cloud/callback/${provider}`;
        const tokens = await cloudProvider.exchangeCode(code, redirectUri);

        const accessEnc = encryptToken(tokens.accessToken);
        const refreshEnc = encryptToken(tokens.refreshToken);

        await withTenant(decoded.tenantId, decoded.userId, async (conn) => {
          // Upsert: delete existing then insert
          await conn.execute(
            `DELETE FROM cloud_connections WHERE tenant_id = :tenantId AND user_id = :userId AND provider = :provider`,
            {
              tenantId: decoded.tenantId,
              userId: decoded.userId,
              provider,
            }
          );

          await conn.execute(
            `INSERT INTO cloud_connections (id, tenant_id, user_id, provider, provider_email, access_token_enc, refresh_token_enc, token_iv, token_expires_at)
             VALUES (:id, :tenantId, :userId, :provider, :email, :accessEnc, :refreshEnc, '-', :expiresAt)`,
            {
              id: crypto.randomUUID(),
              tenantId: decoded.tenantId,
              userId: decoded.userId,
              provider,
              email: tokens.email,
              accessEnc,
              refreshEnc,
              expiresAt: tokens.expiresAt,
            }
          );
        });

        return reply.redirect(`${APP_URL}/documentos/nube?connected=1`);
      } catch (err) {
        console.error("OAuth callback error:", err);
        return reply.redirect(`${APP_URL}/documentos/nube?error=oauth_failed`);
      }
    }
  );

  // GET /api/cloud/connections — list user's connections
  app.get(
    "/api/cloud/connections",
    { preHandler: [requireAuth] },
    async (request) => {
      return await withTenant(
        request.user.tenantId,
        request.user.id,
        async (conn) => {
          const result = await conn.execute<any[]>(
            `SELECT id, provider, provider_email, folder_id, folder_name, created_at
             FROM cloud_connections
             WHERE user_id = :userId
             ORDER BY created_at DESC`,
            { userId: request.user.id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          return {
            connections: (result.rows || []).map((r: any) => ({
              id: r.ID,
              provider: r.PROVIDER,
              providerEmail: r.PROVIDER_EMAIL,
              folderId: r.FOLDER_ID,
              folderName: r.FOLDER_NAME,
              createdAt: r.CREATED_AT,
            })),
          };
        }
      );
    }
  );

  // DELETE /api/cloud/connections/:id — disconnect
  app.delete(
    "/api/cloud/connections/:id",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      await withTenant(
        request.user.tenantId,
        request.user.id,
        async (conn) => {
          const result = await conn.execute(
            `DELETE FROM cloud_connections WHERE id = :id AND user_id = :userId`,
            { id, userId: request.user.id }
          );
          if (!result.rowsAffected) {
            return reply.code(404).send({ error: "Conexión no encontrada" });
          }
        }
      );

      return { ok: true };
    }
  );

  // GET /api/cloud/connections/:id/files — list files with import status
  app.get(
    "/api/cloud/connections/:id/files",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { folderId } = request.query as { folderId?: string };

      return await withTenant(
        request.user.tenantId,
        request.user.id,
        async (conn) => {
          // Load connection
          const connResult = await conn.execute<any[]>(
            `SELECT id, provider, access_token_enc, refresh_token_enc, token_iv, token_expires_at
             FROM cloud_connections WHERE id = :id AND user_id = :userId`,
            { id, userId: request.user.id },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );

          if (!connResult.rows?.length) {
            return reply.code(404).send({ error: "Conexión no encontrada" });
          }

          const row = connResult.rows[0] as any;
          let accessToken = decryptToken(row.ACCESS_TOKEN_ENC);
          const refreshToken = decryptToken(row.REFRESH_TOKEN_ENC);

          // Refresh token if expired
          const expiresAt = row.TOKEN_EXPIRES_AT
            ? new Date(row.TOKEN_EXPIRES_AT)
            : null;
          if (expiresAt && expiresAt < new Date()) {
            const provider = getCloudProvider(row.PROVIDER);
            const refreshed = await provider.refreshAccessToken(refreshToken);
            accessToken = refreshed.accessToken;

            const newEnc = encryptToken(accessToken);
            await conn.execute(
              `UPDATE cloud_connections SET access_token_enc = :enc, token_expires_at = :exp, updated_at = SYSTIMESTAMP
               WHERE id = :id`,
              {
                enc: newEnc,
                exp: refreshed.expiresAt,
                id,
              }
            );
          }

          // List remote files
          const provider = getCloudProvider(row.PROVIDER);
          const files = await provider.listFiles(accessToken, folderId);

          // Get import status for these files
          const remoteIds = files
            .filter((f) => !f.isFolder)
            .map((f) => f.id);

          let importedMap = new Map<
            string,
            { documentId: string | null; remoteModifiedAt: Date | null }
          >();

          if (remoteIds.length > 0) {
            const imported = await conn.execute<any[]>(
              `SELECT remote_file_id, document_id, remote_modified_at
               FROM cloud_imported_files
               WHERE connection_id = :connId`,
              { connId: id },
              { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            for (const imp of imported.rows || []) {
              importedMap.set(imp.REMOTE_FILE_ID, {
                documentId: imp.DOCUMENT_ID,
                remoteModifiedAt: imp.REMOTE_MODIFIED_AT
                  ? new Date(imp.REMOTE_MODIFIED_AT)
                  : null,
              });
            }
          }

          return {
            files: files.map((f) => {
              const imp = importedMap.get(f.id);
              let status: "new" | "imported" | "modified" = "new";
              if (imp) {
                status =
                  imp.remoteModifiedAt &&
                  f.modifiedAt.getTime() > imp.remoteModifiedAt.getTime() + 1000
                    ? "modified"
                    : "imported";
              }
              return {
                id: f.id,
                name: f.name,
                mimeType: f.mimeType,
                size: f.size,
                modifiedAt: f.modifiedAt,
                isFolder: f.isFolder,
                status: f.isFolder ? undefined : status,
                documentId: imp?.documentId || null,
              };
            }),
          };
        }
      );
    }
  );

  // POST /api/cloud/import — import selected files
  app.post(
    "/api/cloud/import",
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { connectionId, files } = request.body as {
        connectionId: string;
        files: { id: string; name: string; mimeType: string }[];
      };

      if (!connectionId || !files?.length) {
        return reply
          .code(400)
          .send({ error: "connectionId y files son obligatorios" });
      }

      try {
        return await withTenant(
          request.user.tenantId,
          request.user.id,
          async (conn) => {
            // Check plan limits
            await checkPlanLimit(conn, request.user.tenantId, "documents");
            await checkPlanLimit(conn, request.user.tenantId, "storage");

            // Load connection
            const connResult = await conn.execute<any[]>(
              `SELECT provider, access_token_enc, refresh_token_enc, token_iv, token_expires_at
               FROM cloud_connections WHERE id = :id AND user_id = :userId`,
              { id: connectionId, userId: request.user.id },
              { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!connResult.rows?.length) {
              return reply
                .code(404)
                .send({ error: "Conexión no encontrada" });
            }

            const row = connResult.rows[0] as any;
            let accessToken = decryptToken(row.ACCESS_TOKEN_ENC);
            const refreshToken = decryptToken(
              row.REFRESH_TOKEN_ENC,
              row.TOKEN_IV
            );

            // Refresh if needed
            const expiresAt = row.TOKEN_EXPIRES_AT
              ? new Date(row.TOKEN_EXPIRES_AT)
              : null;
            if (expiresAt && expiresAt < new Date()) {
              const provider = getCloudProvider(row.PROVIDER);
              const refreshed =
                await provider.refreshAccessToken(refreshToken);
              accessToken = refreshed.accessToken;

              const newEnc = encryptToken(accessToken);
              await conn.execute(
                `UPDATE cloud_connections SET access_token_enc = :enc, token_iv = :iv, token_expires_at = :exp, updated_at = SYSTIMESTAMP
                 WHERE id = :id`,
                {
                  enc: newEnc.encrypted,
                  iv: newEnc.iv,
                  exp: refreshed.expiresAt,
                  id: connectionId,
                }
              );
            }

            const provider = getCloudProvider(row.PROVIDER);
            const imported: {
              fileId: string;
              documentId: string;
              title: string;
            }[] = [];

            const docsDir = path.join(UPLOAD_DIR, "documents");
            await mkdir(docsDir, { recursive: true });

            for (const file of files) {
              const cloudFile: CloudFile = {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                size: null,
                modifiedAt: new Date(),
                isFolder: false,
              };

              const downloaded = await provider.downloadFile(
                accessToken,
                cloudFile
              );

              const docId = crypto.randomUUID();
              const ext = path.extname(downloaded.fileName) || ".pdf";
              const safeFileName = `${docId}${ext}`;
              const filePath = path.join(docsDir, safeFileName);

              await writeFile(filePath, downloaded.buffer);

              const title = file.name.replace(/\.[^.]+$/, "") || file.name;

              await conn.execute(
                `INSERT INTO documents (id, tenant_id, title, file_path, file_name, file_type, file_size, status, visibility, uploaded_by)
                 VALUES (:id, :tenantId, :title, :filePath, :fileName, :fileType, :fileSize, 'PENDING', 'GENERAL', :uploadedBy)`,
                {
                  id: docId,
                  tenantId: request.user.tenantId,
                  title,
                  filePath,
                  fileName: downloaded.fileName,
                  fileType: downloaded.mimeType,
                  fileSize: downloaded.buffer.length,
                  uploadedBy: request.user.id,
                }
              );

              // Track the import (delete + insert instead of MERGE, VPD incompatible)
              await conn.execute(
                `DELETE FROM cloud_imported_files WHERE connection_id = :connId AND remote_file_id = :remoteId`,
                { connId: connectionId, remoteId: file.id }
              );
              await conn.execute(
                `INSERT INTO cloud_imported_files (id, tenant_id, connection_id, remote_file_id, remote_name, remote_modified_at, document_id)
                 VALUES (:id, :tenantId, :connId, :remoteId, :remoteName, SYSTIMESTAMP, :docId)`,
                {
                  id: crypto.randomUUID(),
                  tenantId: request.user.tenantId,
                  connId: connectionId,
                  remoteId: file.id,
                  remoteName: file.name,
                  docId,
                }
              );

              // Fire-and-forget processing
              processDocument(
                docId,
                request.user.tenantId,
                request.user.id,
                filePath,
                downloaded.mimeType,
                title,
                null,
                downloaded.fileName
              ).catch((err) =>
                console.error("Cloud document processing failed:", err)
              );

              imported.push({ fileId: file.id, documentId: docId, title });
            }

            return { imported };
          }
        );
      } catch (err: any) {
        if (err instanceof PlanLimitError)
          return reply.code(403).send({ error: err.message });
        throw err;
      }
    }
  );
}
