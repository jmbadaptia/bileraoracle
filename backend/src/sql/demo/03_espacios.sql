-- ============================================================
-- Demo data: Espacios (Spaces)
-- ============================================================

-- ITSASALDE (tenant 2)
INSERT INTO spaces (id, tenant_id, name, description, capacity, location, color, created_by)
VALUES ('sp-itsa-sala', 2, 'Sala Polivalente', 'Sala principal para eventos y cursos', 60, 'Planta baja, Kulturetxea', '#3b82f6', 'demo-itsa-admin');

INSERT INTO spaces (id, tenant_id, name, description, capacity, location, color, created_by)
VALUES ('sp-itsa-aula', 2, 'Aula de Formación', 'Aula con proyector y pizarra', 20, 'Primera planta, Kulturetxea', '#10b981', 'demo-itsa-admin');

INSERT INTO spaces (id, tenant_id, name, description, capacity, location, color, created_by)
VALUES ('sp-itsa-cocina', 2, 'Cocina Taller', 'Cocina equipada para talleres gastronómicos', 12, 'Planta baja, Kulturetxea', '#f59e0b', 'demo-itsa-admin');

-- MENDIZABAL (tenant 3)
INSERT INTO spaces (id, tenant_id, name, description, capacity, location, color, created_by)
VALUES ('sp-mendi-salon', 3, 'Salón de Actos', 'Salón grande con escenario y equipo de sonido', 100, 'Centro Cívico Mendizabal', '#8b5cf6', 'demo-mendi-admin');

INSERT INTO spaces (id, tenant_id, name, description, capacity, location, color, created_by)
VALUES ('sp-mendi-sala', 3, 'Sala de Reuniones', 'Sala para reuniones de junta y comisiones', 15, 'Centro Cívico Mendizabal', '#06b6d4', 'demo-mendi-admin');

COMMIT;
