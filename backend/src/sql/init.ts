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

    // Detect PL/SQL block start
    if (
      /^(CREATE\s+OR\s+REPLACE|BEGIN|DECLARE)/i.test(trimmed) &&
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

async function init() {
  const conn = await oracledb.getConnection({
    user: process.env.DB_USER || "bilera",
    password: process.env.DB_PASSWORD || "bilera",
    connectString: process.env.DB_CONNECT_STRING || "db:1521/FREEPDB1",
  });

  console.log("Connected to Oracle");

  // First run grants as SYSTEM
  console.log("Running grants as SYSTEM...");
  const sysConn = await oracledb.getConnection({
    user: "SYSTEM",
    password: process.env.ORACLE_PASSWORD || "oracle",
    connectString: process.env.DB_CONNECT_STRING || "db:1521/FREEPDB1",
  });

  const grantsSql = readFileSync(join(__dirname, "000_grants.sql"), "utf-8");
  for (const stmt of splitSQL(grantsSql)) {
    try {
      await sysConn.execute(stmt);
    } catch (err: any) {
      if (err.errorNum !== 1920 && err.errorNum !== 1921) {
        console.error(`  Grant error: ${err.message}`);
      }
    }
  }
  await sysConn.commit();
  await sysConn.close();
  console.log("  Grants done.");

  const sqlFiles = ["001_schema.sql", "002_vpd.sql", "003_seed.sql", "004_vectors.sql", "005_conversations.sql", "006_contacts.sql", "007_chunks.sql", "008_activity_log.sql", "009_theme.sql", "010_spaces.sql", "011_vector_1024.sql"];

  for (const file of sqlFiles) {
    console.log(`Executing ${file}...`);
    const sql = readFileSync(join(__dirname, file), "utf-8");
    const statements = splitSQL(sql);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await conn.execute(stmt);
      } catch (err: any) {
        // Ignore "already exists" (955), "duplicate" (1), "name already used" (955)
        // 955=already exists, 1=duplicate, 1430=column already exists, 28003=password
        if (err.errorNum === 955 || err.errorNum === 1 || err.errorNum === 1430 || err.errorNum === 28003) {
          console.log(`  [${i + 1}] Skipped (already exists)`);
        } else {
          console.error(`  [${i + 1}] Error: ${err.message}`);
          console.error(`       Statement: ${stmt.substring(0, 80)}...`);
        }
      }
    }
    await conn.commit();
    console.log(`  Done.`);
  }

  await conn.close();
  console.log("Database initialized successfully");
}

init().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});
