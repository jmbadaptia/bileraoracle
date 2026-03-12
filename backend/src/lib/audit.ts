import oracledb from "oracledb";

export async function logActivity(
  conn: oracledb.Connection,
  tenantId: string,
  activityId: string,
  userId: string,
  userName: string,
  action: string,
  detail?: string
) {
  await conn.execute(
    `INSERT INTO activity_log (id, tenant_id, activity_id, user_id, user_name, action, detail)
     VALUES (:id, :tenantId, :activityId, :userId, :userName, :action, :detail)`,
    {
      id: crypto.randomUUID(),
      tenantId,
      activityId,
      userId,
      userName,
      action,
      detail: detail || null,
    }
  );
}
