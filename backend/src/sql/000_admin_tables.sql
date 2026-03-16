-- ============================================================
-- Identity tables in bilera_admin schema
-- ============================================================

-- Tenants (organizations/associations)
CREATE TABLE tenants (
  id           NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         VARCHAR2(200)  NOT NULL,
  slug         VARCHAR2(100)  NOT NULL UNIQUE,
  logo_path    VARCHAR2(500),
  plan         VARCHAR2(50)   DEFAULT 'FREE',
  active       NUMBER(1)      DEFAULT 1,
  theme        VARCHAR2(20)   DEFAULT 'default',
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP,
  updated_at   TIMESTAMP      DEFAULT SYSTIMESTAMP
);

-- Users (global, can belong to multiple tenants via memberships)
CREATE TABLE users (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  email        VARCHAR2(255)  NOT NULL UNIQUE,
  password_hash VARCHAR2(255) NOT NULL,
  name         VARCHAR2(200)  NOT NULL,
  avatar_path  VARCHAR2(500),
  phone        VARCHAR2(50),
  bio          CLOB,
  active       NUMBER(1)      DEFAULT 1,
  invite_token         VARCHAR2(64),
  invite_token_expires TIMESTAMP,
  reset_token          VARCHAR2(64),
  reset_token_expires  TIMESTAMP,
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP,
  updated_at   TIMESTAMP      DEFAULT SYSTIMESTAMP
);

CREATE UNIQUE INDEX idx_users_invite_token ON users(invite_token);
CREATE UNIQUE INDEX idx_users_reset_token ON users(reset_token);

-- Memberships (user <-> tenant with role)
CREATE TABLE memberships (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id    NUMBER         NOT NULL REFERENCES tenants(id),
  user_id      VARCHAR2(36)   NOT NULL REFERENCES users(id),
  role         VARCHAR2(20)   DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP,
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_memberships_tenant ON memberships(tenant_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);

-- Grant DML + REFERENCES to bilera app schema
GRANT SELECT, INSERT, UPDATE, DELETE ON tenants TO bilera;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO bilera;
GRANT SELECT, INSERT, UPDATE, DELETE ON memberships TO bilera;
GRANT REFERENCES ON tenants TO bilera;
GRANT REFERENCES ON users TO bilera;
