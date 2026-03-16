-- ============================================================
-- 014: Add setup_complete flag to tenants for onboarding wizard
-- ============================================================

ALTER TABLE tenants ADD (setup_complete NUMBER(1) DEFAULT 0);

-- Mark existing tenants as already set up
UPDATE tenants SET setup_complete = 1;
