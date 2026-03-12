-- Contacts & activity-contacts for external people
CREATE TABLE contacts (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id    NUMBER         NOT NULL REFERENCES tenants(id),
  name         VARCHAR2(300)  NOT NULL,
  phone        VARCHAR2(100),
  email        VARCHAR2(255),
  web          VARCHAR2(500),
  category     VARCHAR2(100),
  notes        CLOB,
  created_by   VARCHAR2(36)   NOT NULL REFERENCES users(id),
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP,
  updated_at   TIMESTAMP      DEFAULT SYSTIMESTAMP
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_category ON contacts(tenant_id, category);

CREATE TABLE activity_contacts (
  activity_id  VARCHAR2(36)   NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  contact_id   VARCHAR2(36)   NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role         VARCHAR2(100),
  PRIMARY KEY (activity_id, contact_id)
);

-- VPD policy for contacts
BEGIN
  DBMS_RLS.ADD_POLICY(
    object_schema   => USER,
    object_name     => 'CONTACTS',
    policy_name     => 'contacts_tenant_vpd',
    function_schema => USER,
    policy_function => 'VPD_TENANT_POLICY',
    statement_types => 'SELECT,UPDATE,DELETE'
  );
END;
/
