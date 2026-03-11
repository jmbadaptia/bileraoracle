-- ============================================================
-- VPD Policies - Automatic tenant isolation
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

BEGIN
  DBMS_RLS.ADD_POLICY(
    object_schema   => USER,
    object_name     => 'GROUPS',
    policy_name     => 'groups_tenant_vpd',
    function_schema => USER,
    policy_function => 'VPD_TENANT_POLICY',
    statement_types => 'SELECT,INSERT,UPDATE,DELETE'
  );
END;
/

BEGIN
  DBMS_RLS.ADD_POLICY(
    object_schema   => USER,
    object_name     => 'ACTIVITIES',
    policy_name     => 'activities_tenant_vpd',
    function_schema => USER,
    policy_function => 'VPD_TENANT_POLICY',
    statement_types => 'SELECT,INSERT,UPDATE,DELETE'
  );
END;
/

BEGIN
  DBMS_RLS.ADD_POLICY(
    object_schema   => USER,
    object_name     => 'TAGS',
    policy_name     => 'tags_tenant_vpd',
    function_schema => USER,
    policy_function => 'VPD_TENANT_POLICY',
    statement_types => 'SELECT,INSERT,UPDATE,DELETE'
  );
END;
/

BEGIN
  DBMS_RLS.ADD_POLICY(
    object_schema   => USER,
    object_name     => 'DOCUMENTS',
    policy_name     => 'documents_tenant_vpd',
    function_schema => USER,
    policy_function => 'VPD_TENANT_POLICY',
    statement_types => 'SELECT,INSERT,UPDATE,DELETE'
  );
END;
/

BEGIN
  DBMS_RLS.ADD_POLICY(
    object_schema   => USER,
    object_name     => 'ALBUMS',
    policy_name     => 'albums_tenant_vpd',
    function_schema => USER,
    policy_function => 'VPD_TENANT_POLICY',
    statement_types => 'SELECT,INSERT,UPDATE,DELETE'
  );
END;
/

BEGIN
  DBMS_RLS.ADD_POLICY(
    object_schema   => USER,
    object_name     => 'MEMBERSHIPS',
    policy_name     => 'memberships_tenant_vpd',
    function_schema => USER,
    policy_function => 'VPD_TENANT_POLICY',
    statement_types => 'SELECT,INSERT,UPDATE,DELETE'
  );
END;
/
