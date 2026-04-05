-- ============================================================
-- Cloud provider connections for importing files from
-- Google Drive, OneDrive, Dropbox, etc.
-- ============================================================

-- OAuth credentials per user per tenant per provider
CREATE TABLE cloud_connections (
  id                VARCHAR2(36)    DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id         NUMBER          NOT NULL REFERENCES tenants(id),
  user_id           VARCHAR2(36)    NOT NULL REFERENCES users(id),
  provider          VARCHAR2(20)    NOT NULL CHECK (provider IN ('GOOGLE_DRIVE', 'ONEDRIVE', 'DROPBOX')),
  provider_email    VARCHAR2(255),
  access_token_enc  VARCHAR2(4000)  NOT NULL,
  refresh_token_enc VARCHAR2(4000)  NOT NULL,
  token_iv          VARCHAR2(100)   NOT NULL,
  token_expires_at  TIMESTAMP,
  folder_id         VARCHAR2(500),
  folder_name       VARCHAR2(500),
  created_at        TIMESTAMP       DEFAULT SYSTIMESTAMP,
  updated_at        TIMESTAMP       DEFAULT SYSTIMESTAMP,
  UNIQUE (tenant_id, user_id, provider)
);

CREATE INDEX idx_cloud_conn_tenant ON cloud_connections(tenant_id, user_id);

-- Track which remote files have been imported
CREATE TABLE cloud_imported_files (
  id                  VARCHAR2(36)    DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id           NUMBER          NOT NULL REFERENCES tenants(id),
  connection_id       VARCHAR2(36)    NOT NULL REFERENCES cloud_connections(id) ON DELETE CASCADE,
  remote_file_id      VARCHAR2(500)   NOT NULL,
  remote_name         VARCHAR2(500),
  remote_modified_at  TIMESTAMP,
  document_id         VARCHAR2(36)    REFERENCES documents(id) ON DELETE SET NULL,
  imported_at         TIMESTAMP       DEFAULT SYSTIMESTAMP,
  UNIQUE (connection_id, remote_file_id)
);

CREATE INDEX idx_cloud_imported_conn ON cloud_imported_files(connection_id);

-- VPD policies
BEGIN DBMS_RLS.ADD_POLICY(USER,'CLOUD_CONNECTIONS','cc_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'CLOUD_CONNECTIONS','cc_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'CLOUD_CONNECTIONS','cc_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'CLOUD_IMPORTED_FILES','cif_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'CLOUD_IMPORTED_FILES','cif_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'CLOUD_IMPORTED_FILES','cif_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/
