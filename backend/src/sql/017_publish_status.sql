-- ============================================================
-- 017: Publication status for activities/inscriptions
-- DRAFT = not visible publicly, PUBLISHED = visible
-- publish_date = auto-publish at this date (NULL = manual only)
-- ============================================================

ALTER TABLE activities ADD (
  publish_status  VARCHAR2(20) DEFAULT 'PUBLISHED',
  publish_date    TIMESTAMP
);
