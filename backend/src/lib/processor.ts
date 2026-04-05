import oracledb from "oracledb";
import { withTenant } from "./db.js";
import { extractText } from "./extractor.js";
import { chunkText } from "./chunker.js";
import { getEmbedding, chatCompletion, buildDocumentText } from "./ai.js";
import { trackAiUsage } from "./ai-usage.js";

export async function processDocument(
  documentId: string,
  tenantId: number,
  userId: string,
  filePath: string,
  mimeType: string,
  title: string,
  description: string | null,
  fileName: string
): Promise<void> {
  try {
    // 1. Set status to PROCESSING
    await withTenant(tenantId, userId, async (conn) => {
      await conn.execute(
        `UPDATE documents SET status = 'PROCESSING', updated_at = SYSTIMESTAMP WHERE id = :id`,
        { id: documentId }
      );
    });

    // 2. Extract text
    let text = "";
    try {
      text = await extractText(filePath);
    } catch (err) {
      console.warn(`Text extraction failed for ${fileName}:`, err);
      // Mark as READY with 0 chunks — file is still downloadable
      await withTenant(tenantId, userId, async (conn) => {
        await conn.execute(
          `UPDATE documents SET status = 'READY', chunk_count = 0,
                  processing_error = :err, updated_at = SYSTIMESTAMP WHERE id = :id`,
          { id: documentId, err: `No se pudo extraer texto: ${(err as Error).message}` }
        );
      });
      // Still generate metadata embedding
      await generateMetadataEmbedding(documentId, tenantId, userId, title, description, fileName);
      return;
    }

    if (!text || text.trim().length === 0) {
      await withTenant(tenantId, userId, async (conn) => {
        await conn.execute(
          `UPDATE documents SET status = 'READY', chunk_count = 0,
                  processing_error = 'Documento sin texto extraible (posiblemente escaneado)',
                  updated_at = SYSTIMESTAMP WHERE id = :id`,
          { id: documentId }
        );
      });
      await generateMetadataEmbedding(documentId, tenantId, userId, title, description, fileName);
      return;
    }

    // 3. Store extracted text
    await withTenant(tenantId, userId, async (conn) => {
      await conn.execute(
        `UPDATE documents SET extracted_text = :text, updated_at = SYSTIMESTAMP WHERE id = :id`,
        { id: documentId, text }
      );
    });

    // 4. Chunk text
    const chunks = chunkText(text);
    console.log(`Document ${documentId}: extracted ${text.length} chars, ${chunks.length} chunks`);

    // 5. Delete old chunks (for reprocessing)
    await withTenant(tenantId, userId, async (conn) => {
      await conn.execute(
        `DELETE FROM document_chunks WHERE document_id = :id`,
        { id: documentId }
      );
    });

    // 6. Generate embeddings and insert chunks
    let successCount = 0;
    let embeddingFailures = 0;
    for (const chunk of chunks) {
      const embResult = await getEmbedding(chunk.text);
      if (embResult) {
        trackAiUsage({ tenantId, userId, callType: "EMBEDDING", model: "cohere-embed-v3", inputChars: embResult.usage.inputChars });
      } else {
        embeddingFailures++;
      }

      await withTenant(tenantId, userId, async (conn) => {
        await conn.execute(
          `INSERT INTO document_chunks (id, tenant_id, document_id, chunk_index, content, embedding)
           VALUES (:id, :tenantId, :docId, :idx, :content, :emb)`,
          {
            id: crypto.randomUUID(),
            tenantId,
            docId: documentId,
            idx: chunk.index,
            content: chunk.text,
            emb: embResult
              ? { val: new Float32Array(embResult.embedding), type: oracledb.DB_TYPE_VECTOR }
              : null,
          }
        );
      });

      successCount++;
      // Rate limit between embedding calls
      if (chunk.index < chunks.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // 7. Auto-generate description if missing
    if (!description && text.length > 50) {
      try {
        const summaryResult = await chatCompletion(
          "Genera un resumen muy breve (2-3 frases) en espanol del siguiente documento. Solo responde con el resumen, sin introduccion.",
          text.substring(0, 3000)
        );
        if (summaryResult) {
          trackAiUsage({ tenantId, userId, callType: "SUMMARY", model: "llama-3.3-70b", inputTokens: summaryResult.usage.promptTokens, outputTokens: summaryResult.usage.completionTokens });
          await withTenant(tenantId, userId, async (conn) => {
            await conn.execute(
              `UPDATE documents SET description = :desc, updated_at = SYSTIMESTAMP WHERE id = :id`,
              { id: documentId, desc: summaryResult.content.trim().substring(0, 2000) }
            );
          });
        }
      } catch {
        // Non-critical
      }
    }

    // 8. Generate metadata embedding
    await generateMetadataEmbedding(documentId, tenantId, userId, title, description, fileName);

    // 9. Mark as READY or ERROR
    const allEmbeddingsFailed = embeddingFailures > 0 && embeddingFailures === chunks.length;
    const someEmbeddingsFailed = embeddingFailures > 0 && embeddingFailures < chunks.length;
    const status = allEmbeddingsFailed ? "ERROR" : "READY";
    const errorMsg = allEmbeddingsFailed
      ? "No se pudieron generar los embeddings. El documento se puede reprocesar."
      : someEmbeddingsFailed
        ? `${embeddingFailures} de ${chunks.length} embeddings fallaron`
        : null;

    await withTenant(tenantId, userId, async (conn) => {
      await conn.execute(
        `UPDATE documents SET status = :status, chunk_count = :cnt,
                processing_error = :err, updated_at = SYSTIMESTAMP WHERE id = :id`,
        { id: documentId, cnt: successCount, status, err: errorMsg }
      );
    });

    console.log(`Document ${documentId} processed: ${successCount} chunks (${embeddingFailures} embedding failures)`);
  } catch (err) {
    console.error(`Document processing failed for ${documentId}:`, err);
    try {
      await withTenant(tenantId, userId, async (conn) => {
        await conn.execute(
          `UPDATE documents SET status = 'ERROR',
                  processing_error = :err, updated_at = SYSTIMESTAMP WHERE id = :id`,
          { id: documentId, err: (err as Error).message?.substring(0, 1000) || "Error desconocido" }
        );
      });
    } catch {
      // Last resort
    }
  }
}

/**
 * Process a text-only document (no file). Used for system documents like the user guide.
 * Creates the document record, chunks, and embeddings.
 */
export async function processTextDocument(
  tenantId: number,
  userId: string,
  title: string,
  text: string,
  visibility: string = "GENERAL"
): Promise<string> {
  const documentId = crypto.randomUUID();

  await withTenant(tenantId, userId, async (conn) => {
    await conn.execute(
      `INSERT INTO documents (id, tenant_id, title, file_path, file_name, file_type, file_size, status, visibility, uploaded_by, extracted_text)
       VALUES (:id, :tenantId, :title, :filePath, :fileName, 'text/plain', :fileSize, 'PROCESSING', :visibility, :userId, :text)`,
      { id: documentId, tenantId, title, filePath: `/system/${documentId}`, fileName: `${documentId}.txt`, fileSize: text.length, visibility, userId, text }
    );
  });

  // Chunk and embed
  const chunks = chunkText(text);
  let successCount = 0;

  for (const chunk of chunks) {
    const embResult = await getEmbedding(chunk.text);
    if (embResult) {
      trackAiUsage({ tenantId, userId, callType: "EMBEDDING", model: "cohere-embed-v3", inputChars: embResult.usage.inputChars });
    }
    await withTenant(tenantId, userId, async (conn) => {
      await conn.execute(
        `INSERT INTO document_chunks (id, tenant_id, document_id, chunk_index, content, embedding)
         VALUES (:id, :tenantId, :docId, :idx, :content, :emb)`,
        {
          id: crypto.randomUUID(),
          tenantId,
          docId: documentId,
          idx: chunk.index,
          content: chunk.text,
          emb: embResult ? { val: new Float32Array(embResult.embedding), type: oracledb.DB_TYPE_VECTOR } : null,
        }
      );
    });
    successCount++;
    if (chunk.index < chunks.length - 1) await new Promise((r) => setTimeout(r, 100));
  }

  // Metadata embedding + mark ready
  await generateMetadataEmbedding(documentId, tenantId, userId, title, null, `${documentId}.txt`);
  await withTenant(tenantId, userId, async (conn) => {
    await conn.execute(
      `UPDATE documents SET status = 'READY', chunk_count = :cnt, updated_at = SYSTIMESTAMP WHERE id = :id`,
      { id: documentId, cnt: successCount }
    );
  });

  console.log(`System document "${title}" processed: ${successCount} chunks for tenant ${tenantId}`);
  return documentId;
}

async function generateMetadataEmbedding(
  id: string, tenantId: number, userId: string,
  title: string, description: string | null, fileName: string
) {
  const text = buildDocumentText(title, description, fileName);
  const embResult = await getEmbedding(text);
  if (!embResult) return;
  trackAiUsage({ tenantId, userId, callType: "EMBEDDING", model: "cohere-embed-v3", inputChars: embResult.usage.inputChars });
  await withTenant(tenantId, userId, async (conn) => {
    await conn.execute(
      `UPDATE documents SET embedding = :emb WHERE id = :id`,
      { emb: { val: new Float32Array(embResult.embedding), type: oracledb.DB_TYPE_VECTOR }, id }
    );
  });
}
