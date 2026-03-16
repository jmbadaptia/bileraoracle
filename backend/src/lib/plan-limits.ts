import oracledb from "oracledb";

const RESOURCE_LABELS: Record<string, string> = {
  members: "miembros",
  activities: "actividades",
  documents: "documentos",
  spaces: "espacios",
  storage: "almacenamiento",
};

const LIMIT_COLUMNS: Record<string, string> = {
  members: "MAX_MEMBERS",
  activities: "MAX_ACTIVITIES",
  documents: "MAX_DOCUMENTS",
  spaces: "MAX_SPACES",
  storage: "MAX_STORAGE_MB",
};

const USAGE_QUERIES: Record<string, string> = {
  members: `SELECT COUNT(*) AS cnt FROM memberships`,
  activities: `SELECT COUNT(*) AS cnt FROM activities`,
  documents: `SELECT COUNT(*) AS cnt FROM documents`,
  spaces: `SELECT COUNT(*) AS cnt FROM spaces`,
  storage: `SELECT FLOOR(NVL((SELECT SUM(file_size) FROM documents), 0) + NVL((SELECT SUM(p.file_size) FROM photos p JOIN albums a ON a.id = p.album_id), 0)) / 1048576 AS cnt FROM DUAL`,
};

export class PlanLimitError extends Error {
  statusCode = 403;
  constructor(resource: string, limit: number, plan: string) {
    const label = RESOURCE_LABELS[resource] || resource;
    const unit = resource === "storage" ? ` MB de ${label}` : ` ${label}`;
    super(`Has alcanzado el límite de ${limit}${unit} del plan ${plan}. Contacta con un administrador para ampliar tu plan.`);
  }
}

export async function checkPlanLimit(
  conn: oracledb.Connection,
  tenantId: number,
  resource: string
): Promise<void> {
  const limitCol = LIMIT_COLUMNS[resource];
  const usageQuery = USAGE_QUERIES[resource];
  if (!limitCol || !usageQuery) return;

  // Get tenant plan and limit in one query
  const limitResult = await conn.execute<any>(
    `SELECT pl.${limitCol} AS plan_limit, t.plan
     FROM tenants t
     JOIN plan_limits pl ON pl.plan = t.plan
     WHERE t.id = :tenantId`,
    { tenantId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const row = limitResult.rows?.[0];
  if (!row) return; // No plan limits configured — allow

  const limit = row.PLAN_LIMIT;
  if (limit === null || limit === undefined) return; // No limit set

  // Count current usage (VPD filters by tenant for tenant-scoped tables)
  const usageResult = await conn.execute<any>(
    usageQuery,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const usage = usageResult.rows?.[0]?.CNT || 0;

  if (usage >= limit) {
    throw new PlanLimitError(resource, limit, row.PLAN);
  }
}

export async function getPlanUsage(
  conn: oracledb.Connection,
  tenantId: number
): Promise<{
  plan: string;
  usage: Record<string, number>;
  limits: Record<string, number>;
}> {
  // Get plan + limits
  const limitResult = await conn.execute<any>(
    `SELECT t.plan, pl.max_members, pl.max_activities, pl.max_documents, pl.max_spaces, pl.max_storage_mb
     FROM tenants t
     JOIN plan_limits pl ON pl.plan = t.plan
     WHERE t.id = :tenantId`,
    { tenantId },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  const row = limitResult.rows?.[0];
  if (!row) {
    return {
      plan: "FREE",
      usage: { members: 0, activities: 0, documents: 0, spaces: 0, storageMb: 0 },
      limits: { members: 10, activities: 100, documents: 50, spaces: 5, storageMb: 500 },
    };
  }

  // Count all usages in parallel
  const [membersR, activitiesR, documentsR, spacesR, storageR] = await Promise.all(
    ["members", "activities", "documents", "spaces", "storage"].map((r) =>
      conn.execute<any>(USAGE_QUERIES[r], {}, { outFormat: oracledb.OUT_FORMAT_OBJECT })
    )
  );

  return {
    plan: row.PLAN,
    usage: {
      members: membersR.rows?.[0]?.CNT || 0,
      activities: activitiesR.rows?.[0]?.CNT || 0,
      documents: documentsR.rows?.[0]?.CNT || 0,
      spaces: spacesR.rows?.[0]?.CNT || 0,
      storageMb: storageR.rows?.[0]?.CNT || 0,
    },
    limits: {
      members: row.MAX_MEMBERS,
      activities: row.MAX_ACTIVITIES,
      documents: row.MAX_DOCUMENTS,
      spaces: row.MAX_SPACES,
      storageMb: row.MAX_STORAGE_MB,
    },
  };
}
