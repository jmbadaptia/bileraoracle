-- ============================================================
-- 023: Mini-site per tenant (Fase A)
-- slug already exists in bilera_admin.tenants (VARCHAR2(100) UNIQUE)
-- This migration adds:
--   site_enabled: toggle para exponer el mini-site público
--   site_config:  JSON con bloques (hero, about, etc.) y tema
-- Run as bilera_admin (tenants lives in bilera_admin schema)
-- ============================================================

ALTER TABLE tenants ADD (
  site_enabled NUMBER(1) DEFAULT 0,
  site_config  CLOB
);
