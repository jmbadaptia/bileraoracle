-- ============================================================
-- Seed data for development
-- ============================================================

-- Create default tenant
INSERT INTO tenants (name, slug) VALUES ('Demo Association', 'demo');

-- Create admin user (password: admin123)
INSERT INTO users (id, email, password_hash, name)
VALUES ('admin-001', 'admin@bilera.es', '$2a$10$rQq9woVGvHZq5e5MzN0NZeA6ZGx8Ey4EkQ5S5v5lJ5o5R5Fz5Z5nO', 'Administrador');

-- Create membership (admin of demo tenant)
INSERT INTO memberships (tenant_id, user_id, role)
VALUES (1, 'admin-001', 'ADMIN');

COMMIT;
