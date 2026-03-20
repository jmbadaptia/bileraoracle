-- ============================================================
-- 018: Course fields — instructor, cover image, sessions
-- ============================================================

-- Instructor (member or contact) + cover image
ALTER TABLE activities ADD (
  instructor_type   VARCHAR2(20),
  instructor_id     VARCHAR2(36),
  cover_image_path  VARCHAR2(500)
);

-- Course sessions
CREATE TABLE course_sessions (
  id           VARCHAR2(36) DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id    NUMBER       NOT NULL,
  activity_id  VARCHAR2(36) NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  session_num  NUMBER       NOT NULL,
  session_date DATE,
  time_start   VARCHAR2(10),
  time_end     VARCHAR2(10),
  title        VARCHAR2(500),
  content      VARCHAR2(2000),
  created_at   TIMESTAMP    DEFAULT SYSTIMESTAMP
);

CREATE INDEX idx_sessions_activity ON course_sessions(activity_id);

-- VPD for course_sessions
BEGIN DBMS_RLS.ADD_POLICY(USER,'COURSE_SESSIONS','cs_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'COURSE_SESSIONS','cs_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'COURSE_SESSIONS','cs_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/
