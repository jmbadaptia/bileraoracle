-- ============================================================
-- 016: Activity enrollments / Inscripciones
-- ============================================================

-- New columns on activities for enrollment config
ALTER TABLE activities ADD (
  enrollment_enabled   NUMBER(1)      DEFAULT 0,
  enrollment_mode      VARCHAR2(20)   DEFAULT 'FIFO',
  max_capacity         NUMBER,
  enrollment_price     NUMBER(10,2)   DEFAULT 0,
  enrollment_deadline  TIMESTAMP
);

-- Enrollments table
CREATE TABLE enrollments (
  id              VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id       NUMBER         NOT NULL,
  activity_id     VARCHAR2(36)   NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  name            VARCHAR2(300)  NOT NULL,
  email           VARCHAR2(300)  NOT NULL,
  phone           VARCHAR2(50),
  status          VARCHAR2(20)   DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'WAITLISTED', 'CANCELLED')),
  cancel_token    VARCHAR2(36)   NOT NULL,
  position        NUMBER,
  enrolled_at     TIMESTAMP      DEFAULT SYSTIMESTAMP,
  confirmed_at    TIMESTAMP,
  cancelled_at    TIMESTAMP
);

CREATE INDEX idx_enrollments_activity ON enrollments(activity_id);
CREATE INDEX idx_enrollments_tenant ON enrollments(tenant_id);
CREATE INDEX idx_enrollments_email ON enrollments(activity_id, email);
CREATE INDEX idx_enrollments_cancel ON enrollments(cancel_token);
CREATE INDEX idx_enrollments_status ON enrollments(activity_id, status);

-- VPD policies for admin queries
BEGIN DBMS_RLS.ADD_POLICY(USER,'ENROLLMENTS','enr_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'ENROLLMENTS','enr_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'ENROLLMENTS','enr_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/
