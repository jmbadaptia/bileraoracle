-- ============================================================
-- 013: Plan limits table (in bilera_admin via synonym)
-- Enforcement comes in Fase 1.3
-- ============================================================

CREATE TABLE plan_limits (
  plan           VARCHAR2(50) PRIMARY KEY,
  max_members    NUMBER DEFAULT 10,
  max_storage_mb NUMBER DEFAULT 500,
  max_activities NUMBER DEFAULT 100,
  max_documents  NUMBER DEFAULT 50,
  max_spaces     NUMBER DEFAULT 5
);

INSERT INTO plan_limits (plan) VALUES ('FREE');

GRANT SELECT ON plan_limits TO bilera;
