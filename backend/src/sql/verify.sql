SET PAGESIZE 100
SET LINESIZE 100

PROMPT === Tables ===
SELECT table_name FROM user_tables ORDER BY 1;

PROMPT === Tenants ===
SELECT id, name, slug FROM tenants;

PROMPT === Users ===
SELECT id, email, name FROM users;

PROMPT === Memberships ===
SELECT tenant_id, user_id, role FROM memberships;

PROMPT === VPD Policies ===
COLUMN object_name FORMAT A20
COLUMN policy_name FORMAT A20
SELECT object_name, policy_name FROM user_policies ORDER BY 1,2;

EXIT;
