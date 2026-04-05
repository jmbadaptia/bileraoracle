-- 019_status_pipeline.sql
-- Migrate activity statuses to new pipeline
-- Public activities (EVENT/TALLER/OTHER): DRAFT → IN_REVIEW → PUBLISHED → FINISHED → ARCHIVED
-- Tasks (TASK): PENDING → IN_PROGRESS → DONE (unchanged)
-- Meetings (MEETING): PENDING → IN_PROGRESS → DONE (unchanged)

-- Step 1: Migrate EVENT/OTHER activities from old statuses
UPDATE activities SET status = 'DRAFT' WHERE type IN ('EVENT', 'TALLER', 'OTHER') AND status = 'PENDING';
UPDATE activities SET status = 'PUBLISHED' WHERE type IN ('EVENT', 'TALLER', 'OTHER') AND status = 'IN_PROGRESS';
UPDATE activities SET status = 'FINISHED' WHERE type IN ('EVENT', 'TALLER', 'OTHER') AND status = 'DONE';

-- Step 2: For enrollment-enabled courses, sync from publish_status
UPDATE activities SET status = 'DRAFT' WHERE enrollment_enabled = 1 AND publish_status = 'DRAFT' AND status NOT IN ('DRAFT');
UPDATE activities SET status = 'PUBLISHED' WHERE enrollment_enabled = 1 AND publish_status = 'PUBLISHED' AND status NOT IN ('PUBLISHED', 'FINISHED', 'ARCHIVED');

COMMIT;
