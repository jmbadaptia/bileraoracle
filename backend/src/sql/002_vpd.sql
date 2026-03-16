-- ============================================================
-- VPD Policies - Automatic tenant isolation
-- NOTE: INSERT policies not supported in Oracle Free edition
-- (app sets tenant_id manually on INSERT anyway)
-- ============================================================

-- Policy function: returns WHERE clause for tenant filtering
CREATE OR REPLACE FUNCTION vpd_tenant_policy(
  p_schema IN VARCHAR2,
  p_table  IN VARCHAR2
) RETURN VARCHAR2 AS
  v_tenant_id VARCHAR2(100);
BEGIN
  v_tenant_id := SYS_CONTEXT('bilera_ctx', 'tenant_id');
  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN 'tenant_id = ' || v_tenant_id;
END;
/

-- GROUPS
BEGIN DBMS_RLS.ADD_POLICY(USER,'GROUPS','groups_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'GROUPS','groups_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'GROUPS','groups_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/

-- ACTIVITIES
BEGIN DBMS_RLS.ADD_POLICY(USER,'ACTIVITIES','act_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'ACTIVITIES','act_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'ACTIVITIES','act_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/

-- TAGS
BEGIN DBMS_RLS.ADD_POLICY(USER,'TAGS','tags_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'TAGS','tags_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'TAGS','tags_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/

-- DOCUMENTS
BEGIN DBMS_RLS.ADD_POLICY(USER,'DOCUMENTS','docs_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'DOCUMENTS','docs_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'DOCUMENTS','docs_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/

-- ALBUMS
BEGIN DBMS_RLS.ADD_POLICY(USER,'ALBUMS','albums_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'ALBUMS','albums_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'ALBUMS','albums_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/

-- NOTE: MEMBERSHIPS VPD is applied cross-schema in 000_admin_vpd.sql (run as SYS)
