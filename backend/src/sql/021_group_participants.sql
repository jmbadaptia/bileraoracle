-- ============================================================
-- Expand groups to include socios and contacts (not just users)
-- ============================================================

-- New flexible table for group membership
CREATE TABLE group_participants (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  group_id     VARCHAR2(36)   NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  member_type  VARCHAR2(20)   NOT NULL CHECK (member_type IN ('USER', 'SOCIO', 'CONTACT')),
  member_id    VARCHAR2(36)   NOT NULL,
  UNIQUE (group_id, member_type, member_id)
);

CREATE INDEX idx_group_part_group ON group_participants(group_id);

-- VPD not needed — groups table already has VPD, and this table is only accessed via JOIN with groups
