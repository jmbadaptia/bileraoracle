-- ============================================================
-- Bilera Oracle - Multi-tenant schema with VPD
-- ============================================================

-- Application context for VPD
CREATE OR REPLACE CONTEXT bilera_ctx USING bilera_ctx_pkg;
/

-- Context package: sets tenant_id and user_id per session
CREATE OR REPLACE PACKAGE bilera_ctx_pkg AS
  PROCEDURE set_context(p_tenant_id IN NUMBER, p_user_id IN VARCHAR2);
  PROCEDURE clear_context;
END bilera_ctx_pkg;
/

CREATE OR REPLACE PACKAGE BODY bilera_ctx_pkg AS
  PROCEDURE set_context(p_tenant_id IN NUMBER, p_user_id IN VARCHAR2) IS
  BEGIN
    DBMS_SESSION.SET_CONTEXT('bilera_ctx', 'tenant_id', TO_CHAR(p_tenant_id));
    DBMS_SESSION.SET_CONTEXT('bilera_ctx', 'user_id', p_user_id);
  END;

  PROCEDURE clear_context IS
  BEGIN
    DBMS_SESSION.CLEAR_CONTEXT('bilera_ctx');
  END;
END bilera_ctx_pkg;
/

-- ============================================================
-- Tables
-- ============================================================

-- Tenants (organizations/associations)
CREATE TABLE tenants (
  id           NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         VARCHAR2(200)  NOT NULL,
  slug         VARCHAR2(100)  NOT NULL UNIQUE,
  logo_path    VARCHAR2(500),
  plan         VARCHAR2(50)   DEFAULT 'FREE',
  active       NUMBER(1)      DEFAULT 1,
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
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP,
  updated_at   TIMESTAMP      DEFAULT SYSTIMESTAMP
);

-- Memberships (user <-> tenant with role)
CREATE TABLE memberships (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id    NUMBER         NOT NULL REFERENCES tenants(id),
  user_id      VARCHAR2(36)   NOT NULL REFERENCES users(id),
  role         VARCHAR2(20)   DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP,
  UNIQUE (tenant_id, user_id)
);

-- Groups (within a tenant)
CREATE TABLE groups (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id    NUMBER         NOT NULL REFERENCES tenants(id),
  name         VARCHAR2(200)  NOT NULL,
  description  VARCHAR2(1000),
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP
);

-- Group members
CREATE TABLE group_members (
  group_id     VARCHAR2(36)   NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id      VARCHAR2(36)   NOT NULL REFERENCES users(id),
  PRIMARY KEY (group_id, user_id)
);

-- Activities
CREATE TABLE activities (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id    NUMBER         NOT NULL REFERENCES tenants(id),
  title        VARCHAR2(500)  NOT NULL,
  description  CLOB,
  type         VARCHAR2(50)   DEFAULT 'TASK',
  status       VARCHAR2(50)   DEFAULT 'PENDING',
  priority     VARCHAR2(20)   DEFAULT 'MEDIUM',
  start_date   TIMESTAMP,
  location     VARCHAR2(500),
  visibility   VARCHAR2(20)   DEFAULT 'GENERAL' CHECK (visibility IN ('GENERAL', 'PRIVATE')),
  owner_id     VARCHAR2(36)   REFERENCES users(id),
  created_by   VARCHAR2(36)   NOT NULL REFERENCES users(id),
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP,
  updated_at   TIMESTAMP      DEFAULT SYSTIMESTAMP
);

-- Activity attendees
CREATE TABLE activity_attendees (
  activity_id  VARCHAR2(36)   NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id      VARCHAR2(36)   NOT NULL REFERENCES users(id),
  PRIMARY KEY (activity_id, user_id)
);

-- Tags
CREATE TABLE tags (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id    NUMBER         NOT NULL REFERENCES tenants(id),
  name         VARCHAR2(100)  NOT NULL,
  color        VARCHAR2(20)
);

-- Activity tags
CREATE TABLE activity_tags (
  activity_id  VARCHAR2(36)   NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  tag_id       VARCHAR2(36)   NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (activity_id, tag_id)
);

-- Documents
CREATE TABLE documents (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id    NUMBER         NOT NULL REFERENCES tenants(id),
  title        VARCHAR2(500)  NOT NULL,
  description  CLOB,
  file_path    VARCHAR2(500)  NOT NULL,
  file_name    VARCHAR2(500)  NOT NULL,
  file_type    VARCHAR2(100),
  file_size    NUMBER,
  status       VARCHAR2(50)   DEFAULT 'PENDING',
  visibility   VARCHAR2(20)   DEFAULT 'GENERAL' CHECK (visibility IN ('GENERAL', 'PRIVATE')),
  uploaded_by  VARCHAR2(36)   NOT NULL REFERENCES users(id),
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP,
  updated_at   TIMESTAMP      DEFAULT SYSTIMESTAMP
);

-- Albums
CREATE TABLE albums (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id    NUMBER         NOT NULL REFERENCES tenants(id),
  title        VARCHAR2(500)  NOT NULL,
  description  CLOB,
  cover_photo_id VARCHAR2(36),
  visibility   VARCHAR2(20)   DEFAULT 'GENERAL' CHECK (visibility IN ('GENERAL', 'PRIVATE')),
  created_by   VARCHAR2(36)   NOT NULL REFERENCES users(id),
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP,
  updated_at   TIMESTAMP      DEFAULT SYSTIMESTAMP
);

-- Photos
CREATE TABLE photos (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  album_id     VARCHAR2(36)   NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  file_path    VARCHAR2(500)  NOT NULL,
  thumbnail_path VARCHAR2(500) NOT NULL,
  file_name    VARCHAR2(500)  NOT NULL,
  file_type    VARCHAR2(100),
  file_size    NUMBER,
  width        NUMBER,
  height       NUMBER,
  caption      VARCHAR2(1000),
  uploaded_by  VARCHAR2(36)   NOT NULL REFERENCES users(id),
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP
);

-- Album-Activity junction
CREATE TABLE album_activities (
  album_id     VARCHAR2(36)   NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  activity_id  VARCHAR2(36)   NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  PRIMARY KEY (album_id, activity_id)
);

-- Document-Activity junction
CREATE TABLE document_activities (
  document_id  VARCHAR2(36)   NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  activity_id  VARCHAR2(36)   NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, activity_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_memberships_tenant ON memberships(tenant_id);
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_groups_tenant ON groups(tenant_id);
CREATE INDEX idx_activities_tenant ON activities(tenant_id);
CREATE INDEX idx_activities_status ON activities(tenant_id, status);
CREATE INDEX idx_activities_owner ON activities(owner_id);
CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_albums_tenant ON albums(tenant_id);
CREATE INDEX idx_photos_album ON photos(album_id);
CREATE INDEX idx_tags_tenant ON tags(tenant_id);
