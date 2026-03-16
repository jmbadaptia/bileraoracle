import oracledb from "oracledb";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function splitSQL(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inPlsql = false;

  for (const line of sql.split("\n")) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("--")) continue;

    // Detect PL/SQL block start (but not CREATE OR REPLACE SYNONYM which is regular DDL)
    if (
      /^(CREATE\s+OR\s+REPLACE\s+(?!SYNONYM)|BEGIN|DECLARE)/i.test(trimmed) &&
      !inPlsql
    ) {
      inPlsql = true;
    }

    current += line + "\n";

    if (inPlsql) {
      // PL/SQL blocks end with / on its own line
      if (trimmed === "/") {
        const block = current.replace(/\n\/\s*$/, "").trim();
        if (block) statements.push(block);
        current = "";
        inPlsql = false;
      }
    } else {
      // Regular SQL ends with ;
      if (trimmed.endsWith(";")) {
        const stmt = current.replace(/;\s*$/, "").trim();
        if (stmt) statements.push(stmt);
        current = "";
      }
    }
  }

  // Remaining
  const remaining = current.trim().replace(/;\s*$/, "").replace(/\/\s*$/, "").trim();
  if (remaining) statements.push(remaining);

  return statements;
}

const SKIP_ERRORS = [955, 1, 1430, 28003, 1920, 1921, 2261, 12006];

async function runFile(conn: oracledb.Connection, file: string, label?: string) {
  const name = label || file;
  console.log(`Executing ${name}...`);
  const sql = readFileSync(join(__dirname, file), "utf-8");
  const statements = splitSQL(sql);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await conn.execute(stmt);
    } catch (err: any) {
      if (SKIP_ERRORS.includes(err.errorNum)) {
        console.log(`  [${i + 1}] Skipped (already exists)`);
      } else {
        console.error(`  [${i + 1}] Error: ${err.message}`);
        console.error(`       Statement: ${stmt.substring(0, 100)}...`);
      }
    }
  }
  await conn.commit();
  console.log(`  Done.`);
}

async function init() {
  const connectString = process.env.DB_CONNECT_STRING || "db:1521/FREEPDB1";

  // ── Phase 1: SYS — grants + create bilera_admin user ──
  console.log("Phase 1: SYS grants...");
  const sysConn = await oracledb.getConnection({
    user: "SYS",
    password: process.env.ORACLE_PASSWORD || "oracle",
    connectString,
    privilege: oracledb.SYSDBA,
  });
  await runFile(sysConn, "000_grants.sql");
  await sysConn.close();

  // ── Phase 2: bilera_admin — identity tables ──
  console.log("Phase 2: bilera_admin tables...");
  const adminConn = await oracledb.getConnection({
    user: process.env.DB_ADMIN_USER || "bilera_admin",
    password: process.env.DB_ADMIN_PASSWORD || "bilera_admin",
    connectString,
  });
  await runFile(adminConn, "000_admin_tables.sql");
  await adminConn.close();

  // ── Phase 3: bilera — synonyms + app schema + seed ──
  console.log("Phase 3: bilera schema...");
  const conn = await oracledb.getConnection({
    user: process.env.DB_USER || "bilera",
    password: process.env.DB_PASSWORD || "bilera",
    connectString,
  });

  // Synonyms first (before any table that references identity tables)
  await runFile(conn, "000_synonyms.sql");

  // App tables + VPD + seed + migrations
  const sqlFiles = [
    "001_schema.sql",
    "002_vpd.sql",
    "003_seed.sql",
    "004_vectors.sql",
    "005_conversations.sql",
    "006_contacts.sql",
    "007_chunks.sql",
    "008_activity_log.sql",
    "009_theme.sql",
    "010_spaces.sql",
    "011_vector_1024.sql",
    "012_auth_tokens.sql",
  ];

  for (const file of sqlFiles) {
    await runFile(conn, file);
  }
  await conn.close();

  // ── Phase 4: SYS — cross-schema VPD for memberships ──
  console.log("Phase 4: Cross-schema VPD...");
  const sysConn2 = await oracledb.getConnection({
    user: "SYS",
    password: process.env.ORACLE_PASSWORD || "oracle",
    connectString,
    privilege: oracledb.SYSDBA,
  });
  await runFile(sysConn2, "000_admin_vpd.sql");
  await sysConn2.close();

  console.log("Database initialized successfully");
}

init().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});
