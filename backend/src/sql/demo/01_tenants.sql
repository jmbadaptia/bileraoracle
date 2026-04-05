-- ============================================================
-- Demo data: Tenants (Associations)
-- ============================================================
-- Run as: bilera/bilera

-- Tenant 1: Asociación Cultural Itsasalde (coastal Basque town)
INSERT INTO tenants (name, slug, setup_complete) VALUES ('Asociación Cultural Itsasalde', 'itsasalde', 1);

-- Tenant 2: Asociación Vecinal Mendizabal (urban neighborhood)
INSERT INTO tenants (name, slug, setup_complete) VALUES ('Asociación Vecinal Mendizabal', 'mendizabal', 1);

COMMIT;
