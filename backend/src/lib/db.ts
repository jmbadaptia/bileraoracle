import oracledb from "oracledb";

// Auto-convert CLOBs to strings (for bio, description, etc.)
oracledb.fetchAsString = [oracledb.CLOB];

let pool: oracledb.Pool;

export async function initPool() {
  pool = await oracledb.createPool({
    user: process.env.DB_USER || "bilera",
    password: process.env.DB_PASSWORD || "bilera",
    connectString: process.env.DB_CONNECT_STRING || "db:1521/FREEPDB1",
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
  });
  console.log("Oracle connection pool created");
}

export async function getConnection(): Promise<oracledb.Connection> {
  return pool.getConnection();
}

// Get a connection with VPD context set for a specific tenant/user
export async function getTenantConnection(
  tenantId: number,
  userId: string
): Promise<oracledb.Connection> {
  const conn = await pool.getConnection();
  await conn.execute(
    `BEGIN bilera_ctx_pkg.set_context(:tenant_id, :user_id); END;`,
    { tenant_id: tenantId, user_id: userId }
  );
  return conn;
}

// Execute a query with tenant context, auto-release connection
export async function withTenant<T>(
  tenantId: number,
  userId: string,
  fn: (conn: oracledb.Connection) => Promise<T>
): Promise<T> {
  const conn = await getTenantConnection(tenantId, userId);
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    // Clear VPD context before returning connection to pool
    try { await conn.execute(`BEGIN bilera_ctx_pkg.clear_context; END;`); } catch {}
    await conn.close();
  }
}

// Execute a query without tenant context (for auth, tenant creation, etc.)
export async function withConnection<T>(
  fn: (conn: oracledb.Connection) => Promise<T>
): Promise<T> {
  const conn = await getConnection();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.close();
  }
}

export async function closePool() {
  if (pool) {
    await pool.close(0);
    console.log("Oracle connection pool closed");
  }
}
