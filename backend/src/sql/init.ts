import oracledb from "oracledb";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function init() {
  const conn = await oracledb.getConnection({
    user: process.env.DB_USER || "bilera",
    password: process.env.DB_PASSWORD || "bilera",
    connectString: process.env.DB_CONNECT_STRING || "db:1521/FREEPDB1",
  });

  console.log("Connected to Oracle");

  const sqlFiles = ["001_schema.sql", "002_vpd.sql", "003_seed.sql"];

  for (const file of sqlFiles) {
    console.log(`Executing ${file}...`);
    const sql = readFileSync(join(__dirname, file), "utf-8");

    // Split by '/' delimiter (for PL/SQL blocks) and ';' for regular statements
    const blocks = sql
      .split(/\n\/\n/)
      .flatMap((block) => {
        // If block contains BEGIN/CREATE PACKAGE/CREATE FUNCTION, keep as one
        if (/\b(BEGIN|CREATE\s+OR\s+REPLACE|DECLARE)\b/i.test(block)) {
          return [block.trim()];
        }
        // Otherwise split by semicolons
        return block.split(";").map((s) => s.trim());
      })
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of blocks) {
      try {
        await conn.execute(statement);
      } catch (err: any) {
        // Ignore "already exists" errors
        if (err.errorNum === 955 || err.errorNum === 1) {
          console.log(`  Skipped (already exists)`);
        } else {
          console.error(`  Error: ${err.message}`);
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
