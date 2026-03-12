-- Activity audit log
CREATE TABLE activity_log (
  id VARCHAR2(36) PRIMARY KEY,
  tenant_id VARCHAR2(36) NOT NULL,
  activity_id VARCHAR2(36) NOT NULL,
  user_id VARCHAR2(36),
  user_name VARCHAR2(200),
  action VARCHAR2(50) NOT NULL,
  detail VARCHAR2(1000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_log_activity ON activity_log(activity_id);
CREATE INDEX idx_activity_log_tenant ON activity_log(tenant_id);
