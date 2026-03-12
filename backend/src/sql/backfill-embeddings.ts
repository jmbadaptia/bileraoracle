import oracledb from "oracledb";
import { getEmbedding, buildActivityText, buildDocumentText, buildAlbumText } from "../lib/ai.js";

oracledb.fetchAsString = [oracledb.CLOB];

async function backfill() {
  const conn = await oracledb.getConnection({
    user: process.env.DB_USER || "bilera",
    password: process.env.DB_PASSWORD || "bilera",
    connectString: process.env.DB_CONNECT_STRING || "db:1521/FREEPDB1",
  });

  console.log("Connected to Oracle. Starting backfill...");

  // Activities
  const acts = await conn.execute<any>(
    `SELECT id, title, description, type, location FROM activities WHERE embedding IS NULL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  console.log(`Activities without embeddings: ${acts.rows?.length || 0}`);
  for (const row of acts.rows || []) {
    const text = buildActivityText(row.TITLE, row.DESCRIPTION, row.TYPE, row.LOCATION);
    const emb = await getEmbedding(text);
    if (emb) {
      await conn.execute(
        `UPDATE activities SET embedding = :emb WHERE id = :id`,
        { emb: { val: new Float32Array(emb), type: oracledb.DB_TYPE_VECTOR }, id: row.ID }
      );
      console.log(`  ✓ Activity: ${row.TITLE}`);
    } else {
      console.log(`  ✗ Activity: ${row.TITLE} (embedding failed)`);
    }
    // Rate limit: 100ms between calls
    await new Promise(r => setTimeout(r, 100));
  }
  await conn.commit();

  // Documents
  const docs = await conn.execute<any>(
    `SELECT id, title, description, file_name FROM documents WHERE embedding IS NULL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  console.log(`Documents without embeddings: ${docs.rows?.length || 0}`);
  for (const row of docs.rows || []) {
    const text = buildDocumentText(row.TITLE, row.DESCRIPTION, row.FILE_NAME);
    const emb = await getEmbedding(text);
    if (emb) {
      await conn.execute(
        `UPDATE documents SET embedding = :emb WHERE id = :id`,
        { emb: { val: new Float32Array(emb), type: oracledb.DB_TYPE_VECTOR }, id: row.ID }
      );
      console.log(`  ✓ Document: ${row.TITLE}`);
    } else {
      console.log(`  ✗ Document: ${row.TITLE} (embedding failed)`);
    }
    await new Promise(r => setTimeout(r, 100));
  }
  await conn.commit();

  // Albums
  const albums = await conn.execute<any>(
    `SELECT id, title, description FROM albums WHERE embedding IS NULL`,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  console.log(`Albums without embeddings: ${albums.rows?.length || 0}`);
  for (const row of albums.rows || []) {
    const text = buildAlbumText(row.TITLE, row.DESCRIPTION);
    const emb = await getEmbedding(text);
    if (emb) {
      await conn.execute(
        `UPDATE albums SET embedding = :emb WHERE id = :id`,
        { emb: { val: new Float32Array(emb), type: oracledb.DB_TYPE_VECTOR }, id: row.ID }
      );
      console.log(`  ✓ Album: ${row.TITLE}`);
    } else {
      console.log(`  ✗ Album: ${row.TITLE} (embedding failed)`);
    }
    await new Promise(r => setTimeout(r, 100));
  }
  await conn.commit();

  await conn.close();
  console.log("Backfill complete!");
}

backfill().catch(err => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
