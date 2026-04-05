-- ============================================================
-- Demo data: Colaboradores (Contacts)
-- ============================================================

-- ITSASALDE (tenant 2)
INSERT INTO contacts (id, tenant_id, name, phone, email, category, notes, created_by)
VALUES ('ct-itsa-chef', 61, 'Eneko Atxa', '944 123 456', 'eneko@azurmendi.eus', 'Ponente', 'Chef con estrella Michelin, colabora en talleres de cocina', 'demo-itsa-admin');

INSERT INTO contacts (id, tenant_id, name, phone, email, category, notes, created_by)
VALUES ('ct-itsa-musico', 61, 'Izaro Andrés', '688 111 222', 'izaro@musik.eus', 'Colaborador/a', 'Cantautora vasca, participa en eventos culturales', 'demo-itsa-admin');

INSERT INTO contacts (id, tenant_id, name, phone, email, category, notes, created_by)
VALUES ('ct-itsa-ayto', 61, 'Ayuntamiento de Getaria', '943 140 100', 'kultura@getaria.eus', 'Institución', 'Colaboración en subvenciones y cesión de espacios', 'demo-itsa-admin');

INSERT INTO contacts (id, tenant_id, name, phone, email, web, category, created_by)
VALUES ('ct-itsa-imprenta', 61, 'Gráficas Leizaran', '943 692 100', 'info@leizaran.com', 'https://leizaran.com', 'Proveedor/a', 'demo-itsa-admin');

-- MENDIZABAL (tenant 3)
INSERT INTO contacts (id, tenant_id, name, phone, email, category, notes, created_by)
VALUES ('ct-mendi-abogado', 62, 'Ana Belén Torres', '91 555 1234', 'anabelen@bufete.es', 'Colaborador/a', 'Abogada urbanista, asesora en temas vecinales', 'demo-mendi-admin');

INSERT INTO contacts (id, tenant_id, name, phone, email, category, created_by)
VALUES ('ct-mendi-concejal', 62, 'Miguel Ángel Sanz', '91 555 5678', 'masanz@ayto.es', 'Político/a', 'demo-mendi-admin');

INSERT INTO contacts (id, tenant_id, name, email, category, notes, created_by)
VALUES ('ct-mendi-prensa', 62, 'Diario del Barrio', 'redaccion@diariobarrio.es', 'Medio de comunicación', 'Publican nuestros eventos si avisamos con 1 semana', 'demo-mendi-admin');

COMMIT;
