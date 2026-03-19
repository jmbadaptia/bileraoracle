-- ============================================================
-- 015: AI usage tracking per tenant/user
-- ============================================================

CREATE TABLE ai_usage_log (
  id              VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id       NUMBER         NOT NULL,
  user_id         VARCHAR2(36)   NOT NULL,
  call_type       VARCHAR2(20)   NOT NULL,
  model           VARCHAR2(100)  NOT NULL,
  input_tokens    NUMBER         DEFAULT 0,
  output_tokens   NUMBER         DEFAULT 0,
  input_chars     NUMBER         DEFAULT 0,
  cost_usd        NUMBER(10,6)   DEFAULT 0,
  month_key       VARCHAR2(7)    NOT NULL,
  created_at      TIMESTAMP      DEFAULT SYSTIMESTAMP
);

CREATE INDEX idx_ai_usage_tenant_month ON ai_usage_log(tenant_id, month_key);
CREATE INDEX idx_ai_usage_user_month ON ai_usage_log(tenant_id, user_id, month_key);

ALTER TABLE plan_limits ADD max_ai_cost_usd NUMBER(10,2) DEFAULT 5.00;

GRANT SELECT, INSERT ON ai_usage_log TO bilera;
