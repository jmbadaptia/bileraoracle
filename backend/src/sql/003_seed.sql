-- ============================================================
-- Seed data for development
-- ============================================================

-- Create default tenant
INSERT INTO tenants (name, slug) VALUES ('Demo Association', 'demo');

-- Create admin user (password: admin123)
INSERT INTO users (id, email, password_hash, name)
VALUES ('admin-001', 'admin@bilera.es', '$2a$10$0P/s8ybmTn5HqGXP/Ym0NO7HgiyqR/FwrHiJJJZKQR5BWzF9rB0c6', 'Administrador');

-- Create membership (admin of demo tenant)
INSERT INTO memberships (tenant_id, user_id, role)
VALUES (1, 'admin-001', 'ADMIN');

COMMIT;
