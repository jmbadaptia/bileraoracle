-- ============================================================
-- Synonyms: bilera -> bilera_admin identity tables
-- Future: change to bilera_admin.table@dblink for remote DB
-- ============================================================

CREATE OR REPLACE SYNONYM tenants FOR bilera_admin.tenants;

CREATE OR REPLACE SYNONYM users FOR bilera_admin.users;

CREATE OR REPLACE SYNONYM memberships FOR bilera_admin.memberships;
