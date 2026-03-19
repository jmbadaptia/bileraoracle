import oracledb from "oracledb";
import { withConnection } from "./db.js";

// OCI Gen AI pricing
const CHAT_COST_PER_1K_INPUT = 0.0018; // Llama 3.3 70B On Demand
const CHAT_COST_PER_1K_OUTPUT = 0.0018;
const EMBED_COST_PER_1K_CHARS = 0.0001; // Cohere embed multilingual v3

export interface AiUsageEntry {
  tenantId: number;
  userId: string;
  callType: "CHAT" | "EMBEDDING" | "SUMMARY" | "TITLE";
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  inputChars?: number;
}

function calculateCost(entry: AiUsageEntry): number {
  if (entry.callType === "EMBEDDING") {
    return ((entry.inputChars || 0) / 1000) * EMBED_COST_PER_1K_CHARS;
  }
  return (
    ((entry.inputTokens || 0) / 1000) * CHAT_COST_PER_1K_INPUT +
    ((entry.outputTokens || 0) / 1000) * CHAT_COST_PER_1K_OUTPUT
  );
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function trackAiUsage(entry: AiUsageEntry): Promise<void> {
  const cost = calculateCost(entry);
  const monthKey = currentMonthKey();

  try {
    await withConnection(async (conn) => {
      await conn.execute(
        `INSERT INTO ai_usage_log
         (id, tenant_id, user_id, call_type, model, input_tokens, output_tokens, input_chars, cost_usd, month_key)
         VALUES (SYS_GUID(), :tenantId, :userId, :callType, :model,
                 :inputTokens, :outputTokens, :inputChars, :cost, :monthKey)`,
        {
          tenantId: entry.tenantId,
          userId: entry.userId,
          callType: entry.callType,
          model: entry.model,
          inputTokens: entry.inputTokens || 0,
          outputTokens: entry.outputTokens || 0,
          inputChars: entry.inputChars || 0,
          cost,
          monthKey,
        }
      );
    });
  } catch (err) {
    console.warn("AI usage tracking failed:", err);
  }
}

export async function checkAiCostLimit(
  tenantId: number
): Promise<{ allowed: boolean; currentCost: number; limit: number }> {
  try {
    return await withConnection(async (conn) => {
      const monthKey = currentMonthKey();

      const [usageResult, limitResult] = await Promise.all([
        conn.execute<any>(
          `SELECT NVL(SUM(cost_usd), 0) AS total_cost FROM ai_usage_log
           WHERE tenant_id = :tenantId AND month_key = :monthKey`,
          { tenantId, monthKey },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        ),
        conn.execute<any>(
          `SELECT pl.max_ai_cost_usd
           FROM tenants t JOIN plan_limits pl ON pl.plan = t.plan
           WHERE t.id = :tenantId`,
          { tenantId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        ),
      ]);

      const currentCost = usageResult.rows?.[0]?.TOTAL_COST || 0;
      const limit = limitResult.rows?.[0]?.MAX_AI_COST_USD;

      if (limit === null || limit === undefined) {
        return { allowed: true, currentCost, limit: Infinity };
      }

      return { allowed: currentCost < limit, currentCost, limit };
    });
  } catch (err) {
    console.warn("AI limit check failed, allowing call:", err);
    return { allowed: true, currentCost: 0, limit: Infinity };
  }
}

export async function getAiUsageStats(
  tenantId: number,
  monthKey?: string
): Promise<{
  monthKey: string;
  totalCost: number;
  totalCalls: number;
  limit: number;
  byUser: Array<{ userId: string; userName: string; cost: number; calls: number }>;
  byType: Array<{ callType: string; cost: number; calls: number }>;
}> {
  const mk = monthKey || currentMonthKey();

  return withConnection(async (conn) => {
    const [totalR, byUserR, byTypeR, limitR] = await Promise.all([
      conn.execute<any>(
        `SELECT NVL(SUM(cost_usd), 0) AS total_cost, COUNT(*) AS total_calls
         FROM ai_usage_log WHERE tenant_id = :tid AND month_key = :mk`,
        { tid: tenantId, mk },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      conn.execute<any>(
        `SELECT a.user_id, u.name AS user_name,
                SUM(a.cost_usd) AS cost, COUNT(*) AS calls
         FROM ai_usage_log a
         JOIN users u ON u.id = a.user_id
         WHERE a.tenant_id = :tid AND a.month_key = :mk
         GROUP BY a.user_id, u.name
         ORDER BY cost DESC`,
        { tid: tenantId, mk },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      conn.execute<any>(
        `SELECT call_type, SUM(cost_usd) AS cost, COUNT(*) AS calls
         FROM ai_usage_log WHERE tenant_id = :tid AND month_key = :mk
         GROUP BY call_type ORDER BY cost DESC`,
        { tid: tenantId, mk },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      conn.execute<any>(
        `SELECT pl.max_ai_cost_usd
         FROM tenants t JOIN plan_limits pl ON pl.plan = t.plan
         WHERE t.id = :tid`,
        { tid: tenantId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
    ]);

    return {
      monthKey: mk,
      totalCost: totalR.rows?.[0]?.TOTAL_COST || 0,
      totalCalls: totalR.rows?.[0]?.TOTAL_CALLS || 0,
      limit: limitR.rows?.[0]?.MAX_AI_COST_USD ?? 5.0,
      byUser: (byUserR.rows || []).map((r: any) => ({
        userId: r.USER_ID,
        userName: r.USER_NAME,
        cost: r.COST,
        calls: r.CALLS,
      })),
      byType: (byTypeR.rows || []).map((r: any) => ({
        callType: r.CALL_TYPE,
        cost: r.COST,
        calls: r.CALLS,
      })),
    };
  });
}
