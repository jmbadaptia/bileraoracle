-- ============================================================
-- Demo data: Users and Memberships
-- ============================================================
-- Password for all users: demo123
-- Hash: $2a$10$LK3xG6y6q5mQzH9p2Bk7Z.VJ3YfGd8vKjXhE1wR9tN4aU2cS6mO0e
-- Run as: bilera/bilera

-- NOTE: Tenant IDs depend on existing data.
-- If you already have tenant 1 (Demo Association from 003_seed.sql),
-- Itsasalde will be tenant 2, Mendizabal will be tenant 3.
-- Adjust the numbers below if needed.

-- ============================================================
-- ITSASALDE (tenant 2)
-- ============================================================

-- Admin: Maite Etxeberria
INSERT INTO users (id, email, password_hash, name)
VALUES ('demo-itsa-admin', 'maite@itsasalde.eus', '$2a$10$LK3xG6y6q5mQzH9p2Bk7Z.VJ3YfGd8vKjXhE1wR9tN4aU2cS6mO0e', 'Maite Etxeberria');

INSERT INTO memberships (tenant_id, user_id, role) VALUES (61, 'demo-itsa-admin', 'ADMIN');

-- Member: Jokin Arrieta
INSERT INTO users (id, email, password_hash, name)
VALUES ('demo-itsa-jokin', 'jokin@itsasalde.eus', '$2a$10$LK3xG6y6q5mQzH9p2Bk7Z.VJ3YfGd8vKjXhE1wR9tN4aU2cS6mO0e', 'Jokin Arrieta');

INSERT INTO memberships (tenant_id, user_id, role) VALUES (61, 'demo-itsa-jokin', 'MEMBER');

-- Member: Amaia Goikoetxea
INSERT INTO users (id, email, password_hash, name)
VALUES ('demo-itsa-amaia', 'amaia@itsasalde.eus', '$2a$10$LK3xG6y6q5mQzH9p2Bk7Z.VJ3YfGd8vKjXhE1wR9tN4aU2cS6mO0e', 'Amaia Goikoetxea');

INSERT INTO memberships (tenant_id, user_id, role) VALUES (61, 'demo-itsa-amaia', 'MEMBER');

-- Member: Ander Lizarraga
INSERT INTO users (id, email, password_hash, name)
VALUES ('demo-itsa-ander', 'ander@itsasalde.eus', '$2a$10$LK3xG6y6q5mQzH9p2Bk7Z.VJ3YfGd8vKjXhE1wR9tN4aU2cS6mO0e', 'Ander Lizarraga');

INSERT INTO memberships (tenant_id, user_id, role) VALUES (61, 'demo-itsa-ander', 'MEMBER');

-- ============================================================
-- MENDIZABAL (tenant 3)
-- ============================================================

-- Admin: Carlos Mendoza
INSERT INTO users (id, email, password_hash, name)
VALUES ('demo-mendi-admin', 'carlos@mendizabal.org', '$2a$10$LK3xG6y6q5mQzH9p2Bk7Z.VJ3YfGd8vKjXhE1wR9tN4aU2cS6mO0e', 'Carlos Mendoza');

INSERT INTO memberships (tenant_id, user_id, role) VALUES (62, 'demo-mendi-admin', 'ADMIN');

-- Member: Laura García
INSERT INTO users (id, email, password_hash, name)
VALUES ('demo-mendi-laura', 'laura@mendizabal.org', '$2a$10$LK3xG6y6q5mQzH9p2Bk7Z.VJ3YfGd8vKjXhE1wR9tN4aU2cS6mO0e', 'Laura García');

INSERT INTO memberships (tenant_id, user_id, role) VALUES (62, 'demo-mendi-laura', 'MEMBER');

-- Member: Pablo Ruiz
INSERT INTO users (id, email, password_hash, name)
VALUES ('demo-mendi-pablo', 'pablo@mendizabal.org', '$2a$10$LK3xG6y6q5mQzH9p2Bk7Z.VJ3YfGd8vKjXhE1wR9tN4aU2cS6mO0e', 'Pablo Ruiz');

INSERT INTO memberships (tenant_id, user_id, role) VALUES (62, 'demo-mendi-pablo', 'MEMBER');

COMMIT;
