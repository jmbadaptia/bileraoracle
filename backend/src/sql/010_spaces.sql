-- Spaces
CREATE TABLE spaces (
  id          VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id   NUMBER NOT NULL REFERENCES tenants(id),
  name        VARCHAR2(200) NOT NULL,
  description VARCHAR2(1000),
  capacity    NUMBER,
  location    VARCHAR2(300),
  color       VARCHAR2(20) DEFAULT '#3b82f6',
  active      NUMBER(1) DEFAULT 1,
  created_by  VARCHAR2(36) REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at  TIMESTAMP DEFAULT SYSTIMESTAMP
);

CREATE INDEX idx_spaces_tenant ON spaces(tenant_id);

-- Bookings
CREATE TABLE bookings (
  id          VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id   NUMBER NOT NULL REFERENCES tenants(id),
  space_id    VARCHAR2(36) NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title       VARCHAR2(300) NOT NULL,
  start_date  TIMESTAMP NOT NULL,
  end_date    TIMESTAMP NOT NULL,
  notes       VARCHAR2(2000),
  activity_id VARCHAR2(36) REFERENCES activities(id) ON DELETE SET NULL,
  booked_by   VARCHAR2(36) NOT NULL REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT SYSTIMESTAMP,
  updated_at  TIMESTAMP DEFAULT SYSTIMESTAMP,
  CONSTRAINT chk_booking_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_space_dates ON bookings(space_id, start_date, end_date);

-- VPD policies
BEGIN
  DBMS_RLS.ADD_POLICY(
    object_schema   => USER,
    object_name     => 'SPACES',
    policy_name     => 'spaces_tenant_policy',
    function_schema => USER,
    policy_function => 'VPD_TENANT_POLICY',
    statement_types => 'SELECT,UPDATE,DELETE'
  );
END;
/

BEGIN
  DBMS_RLS.ADD_POLICY(
    object_schema   => USER,
    object_name     => 'BOOKINGS',
    policy_name     => 'bookings_tenant_policy',
    function_schema => USER,
    policy_function => 'VPD_TENANT_POLICY',
    statement_types => 'SELECT,UPDATE,DELETE'
  );
END;
/
