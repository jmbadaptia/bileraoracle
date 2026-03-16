-- ============================================================
-- Cross-schema VPD for memberships (run as SYS)
-- The policy function lives in bilera, the table in bilera_admin
-- SYS_CONTEXT is session-level so it works across schemas
-- NOTE: INSERT policies not supported in Oracle Free edition
-- ============================================================

GRANT EXECUTE ON bilera.vpd_tenant_policy TO bilera_admin;

BEGIN DBMS_RLS.ADD_POLICY('BILERA_ADMIN','MEMBERSHIPS','memb_sel_vpd','BILERA','VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY('BILERA_ADMIN','MEMBERSHIPS','memb_upd_vpd','BILERA','VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY('BILERA_ADMIN','MEMBERSHIPS','memb_del_vpd','BILERA','VPD_TENANT_POLICY','DELETE'); END;
/
