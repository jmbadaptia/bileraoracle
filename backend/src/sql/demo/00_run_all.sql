-- ============================================================
-- Demo data: Master script — runs all demo scripts in order
-- ============================================================
-- Usage:
--   MSYS_NO_PATHCONV=1 docker exec -i bilera-db sqlplus bilera/bilera@//localhost:1521/FREEPDB1 < backend/src/sql/demo/00_run_all.sql
--
-- Prerequisites:
--   - Base schema (001_schema.sql through 019_status_pipeline.sql) already applied
--   - Existing seed data (003_seed.sql) is OK — demo data uses different IDs
--
-- Creates:
--   - 2 associations (Itsasalde + Mendizabal)
--   - 7 users (4 + 3) with memberships
--   - 5 spaces (3 + 2)
--   - 7 collaborators/contacts (4 + 3)
--   - 14 socios (8 + 6)
--   - ~20 activities: events, courses, tasks, meetings
--   - Course sessions and enrollments
--   - Groups, tags, attendees
--
-- Login credentials:
--   All demo users: password = demo123
--   Itsasalde admin: maite@itsasalde.eus / demo123
--   Mendizabal admin: carlos@mendizabal.org / demo123
-- ============================================================

@backend/src/sql/demo/01_tenants.sql
@backend/src/sql/demo/02_users.sql
@backend/src/sql/demo/03_espacios.sql
@backend/src/sql/demo/04_colaboradores.sql
@backend/src/sql/demo/05_socios.sql
@backend/src/sql/demo/06_actividades.sql
@backend/src/sql/demo/07_sesiones_inscripciones.sql
@backend/src/sql/demo/08_grupos_tags_asistentes.sql

PROMPT ============================================================
PROMPT Demo data loaded successfully!
PROMPT
PROMPT Associations:
PROMPT   - Itsasalde (maite@itsasalde.eus / demo123)
PROMPT   - Mendizabal (carlos@mendizabal.org / demo123)
PROMPT ============================================================
