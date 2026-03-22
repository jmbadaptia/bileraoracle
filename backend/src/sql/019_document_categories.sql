-- ============================================================
-- Document Categories (N:M relationship)
-- ============================================================

-- Category definitions per tenant
CREATE TABLE document_categories (
  id        VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id NUMBER NOT NULL REFERENCES tenants(id),
  name      VARCHAR2(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doc_cat_tenant ON document_categories(tenant_id);

-- N:M relationship between documents and categories
CREATE TABLE document_category_map (
  document_id VARCHAR2(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  category_id VARCHAR2(36) NOT NULL REFERENCES document_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, category_id)
);

-- VPD for document_categories
BEGIN DBMS_RLS.ADD_POLICY(USER,'DOCUMENT_CATEGORIES','dc_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'DOCUMENT_CATEGORIES','dc_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'DOCUMENT_CATEGORIES','dc_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/
