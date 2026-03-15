-- ============================================================
-- 012: Add invite and reset token columns to users
-- ============================================================

ALTER TABLE users ADD (
  invite_token         VARCHAR2(64),
  invite_token_expires TIMESTAMP,
  reset_token          VARCHAR2(64),
  reset_token_expires  TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_invite_token ON users(invite_token);
CREATE UNIQUE INDEX idx_users_reset_token ON users(reset_token);
