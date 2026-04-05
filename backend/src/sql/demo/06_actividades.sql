-- ============================================================
-- Demo data: Actividades (Events, Courses, Tasks, Meetings)
-- ============================================================

-- ============================================================
-- ITSASALDE (tenant 2)
-- ============================================================

-- === EVENTOS ===
INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by, publish_status)
VALUES ('act-itsa-ev1', 2, 'Fiesta de la Cosecha', 'Celebración anual de la cosecha con degustación de sidra, bertsos y música en vivo. Abierto a todo el pueblo.', 'EVENT', 'PUBLISHED', TIMESTAMP '2026-05-10 18:00:00', 'Plaza del Puerto', 'demo-itsa-admin', 'demo-itsa-admin', 'PUBLISHED');

INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by, publish_status)
VALUES ('act-itsa-ev2', 2, 'Charla: Historia marítima de Getaria', 'Charla divulgativa sobre la historia naval del municipio. Con proyección de imágenes históricas.', 'EVENT', 'PUBLISHED', TIMESTAMP '2026-04-22 19:30:00', 'Sala Polivalente', 'demo-itsa-jokin', 'demo-itsa-jokin', 'PUBLISHED');

INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by, publish_status)
VALUES ('act-itsa-ev3', 2, 'Excursión al Flysch de Zumaia', 'Excursión guiada por los acantilados del Flysch. Transporte incluido. Dificultad media.', 'EVENT', 'DRAFT', TIMESTAMP '2026-06-14 09:00:00', 'Salida desde Kulturetxea', 'demo-itsa-amaia', 'demo-itsa-amaia', 'DRAFT');

-- === CURSOS (con inscripción) ===
INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by, publish_status,
  enrollment_enabled, enrollment_mode, max_capacity, enrollment_price, enrollment_deadline, instructor_type, instructor_id)
VALUES ('act-itsa-cu1', 2, 'Curso de Cocina Vasca Tradicional', 'Aprende a preparar los platos más emblemáticos de la cocina vasca: marmitako, bacalao al pil-pil, pintxos...', 'EVENT', 'PUBLISHED', TIMESTAMP '2026-04-28 18:00:00', 'Cocina Taller', 'demo-itsa-admin', 'demo-itsa-admin', 'PUBLISHED',
  1, 'FIFO', 12, 45.00, TIMESTAMP '2026-04-25 23:59:00', 'CONTACT', 'ct-itsa-chef');

INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by, publish_status,
  enrollment_enabled, enrollment_mode, max_capacity, enrollment_price, enrollment_deadline)
VALUES ('act-itsa-cu2', 2, 'Taller de Fotografía de Paisaje', 'Taller práctico de fotografía de paisaje. Traer cámara propia. Nivel principiante-intermedio.', 'TALLER', 'PUBLISHED', TIMESTAMP '2026-05-03 10:00:00', 'Aula de Formación', 'demo-itsa-amaia', 'demo-itsa-amaia', 'PUBLISHED',
  1, 'FIFO', 15, 0, TIMESTAMP '2026-05-01 23:59:00');

INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by, publish_status,
  enrollment_enabled, enrollment_mode, max_capacity, enrollment_price, enrollment_deadline)
VALUES ('act-itsa-cu3', 2, 'Curso de Euskera para Adultos', 'Curso intensivo de euskera nivel A1. Dos sesiones semanales durante 3 meses.', 'EVENT', 'DRAFT', TIMESTAMP '2026-09-15 19:00:00', 'Aula de Formación', 'demo-itsa-admin', 'demo-itsa-admin', 'DRAFT',
  1, 'FIFO', 20, 30.00, TIMESTAMP '2026-09-10 23:59:00');

-- === TAREAS ===
INSERT INTO activities (id, tenant_id, title, description, type, status, priority, start_date, owner_id, created_by)
VALUES ('act-itsa-ta1', 2, 'Renovar póliza de seguro del local', 'La póliza vence el 30 de junio. Contactar con Zurich.', 'TASK', 'PENDING', 'HIGH', TIMESTAMP '2026-06-15 00:00:00', 'demo-itsa-admin', 'demo-itsa-admin');

INSERT INTO activities (id, tenant_id, title, description, type, status, priority, start_date, owner_id, created_by)
VALUES ('act-itsa-ta2', 2, 'Comprar material para taller de fotografía', 'Trípodes de préstamo, tarjetas SD de repuesto, baterías', 'TASK', 'IN_PROGRESS', 'MEDIUM', TIMESTAMP '2026-04-30 00:00:00', 'demo-itsa-amaia', 'demo-itsa-amaia');

INSERT INTO activities (id, tenant_id, title, description, type, status, priority, owner_id, created_by)
VALUES ('act-itsa-ta3', 2, 'Actualizar web con actividades de primavera', NULL, 'TASK', 'DONE', 'MEDIUM', 'demo-itsa-jokin', 'demo-itsa-jokin');

INSERT INTO activities (id, tenant_id, title, type, status, priority, start_date, owner_id, created_by)
VALUES ('act-itsa-ta4', 2, 'Solicitar subvención Diputación 2026', 'TASK', 'PENDING', 'HIGH', TIMESTAMP '2026-05-31 00:00:00', 'demo-itsa-admin', 'demo-itsa-admin');

-- === REUNIONES ===
INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by)
VALUES ('act-itsa-re1', 2, 'Junta Directiva - Abril', 'Orden del día: presupuesto Q2, planificación verano, revisión socios.', 'MEETING', 'PENDING', TIMESTAMP '2026-04-15 19:00:00', 'Sala Polivalente', 'demo-itsa-admin', 'demo-itsa-admin');

INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by)
VALUES ('act-itsa-re2', 2, 'Comisión de Fiestas', 'Planificación de la Fiesta de la Cosecha: presupuesto, cartel, programa.', 'MEETING', 'PENDING', TIMESTAMP '2026-04-20 18:30:00', 'Sala Polivalente', 'demo-itsa-jokin', 'demo-itsa-jokin');

INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by)
VALUES ('act-itsa-re3', 2, 'Asamblea General Ordinaria', 'Aprobación de cuentas 2025 y presupuesto 2026.', 'MEETING', 'DONE', TIMESTAMP '2026-03-10 19:00:00', 'Sala Polivalente', 'demo-itsa-admin', 'demo-itsa-admin');

-- ============================================================
-- MENDIZABAL (tenant 3)
-- ============================================================

-- === EVENTOS ===
INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by, publish_status)
VALUES ('act-mendi-ev1', 3, 'Mercadillo Solidario de Primavera', 'Mercadillo con artesanía local, repostería casera y actividades infantiles. Recaudación para el comedor social.', 'EVENT', 'PUBLISHED', TIMESTAMP '2026-04-26 10:00:00', 'Plaza del Barrio', 'demo-mendi-admin', 'demo-mendi-admin', 'PUBLISHED');

INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by, publish_status)
VALUES ('act-mendi-ev2', 3, 'Cine al Aire Libre: Verano 2026', 'Primer pase del ciclo de cine de verano. Película por determinar. Entrada libre.', 'EVENT', 'DRAFT', TIMESTAMP '2026-07-05 21:30:00', 'Patio del Centro Cívico', 'demo-mendi-laura', 'demo-mendi-laura', 'DRAFT');

-- === CURSOS (con inscripción) ===
INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by, publish_status,
  enrollment_enabled, enrollment_mode, max_capacity, enrollment_price, enrollment_deadline)
VALUES ('act-mendi-cu1', 3, 'Taller de Huerto Urbano', 'Aprende a montar y mantener tu propio huerto en terraza o balcón. Incluye kit de semillas.', 'TALLER', 'PUBLISHED', TIMESTAMP '2026-05-08 17:00:00', 'Salón de Actos', 'demo-mendi-laura', 'demo-mendi-laura', 'PUBLISHED',
  1, 'FIFO', 25, 10.00, TIMESTAMP '2026-05-06 23:59:00');

INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by, publish_status,
  enrollment_enabled, enrollment_mode, max_capacity, enrollment_price, enrollment_deadline)
VALUES ('act-mendi-cu2', 3, 'Curso de Informática para Mayores', 'Uso básico del móvil, WhatsApp, email y trámites online. Paciencia infinita garantizada.', 'EVENT', 'PUBLISHED', TIMESTAMP '2026-04-21 10:00:00', 'Sala de Reuniones', 'demo-mendi-pablo', 'demo-mendi-pablo', 'PUBLISHED',
  1, 'FIFO', 10, 0, TIMESTAMP '2026-04-18 23:59:00');

-- === TAREAS ===
INSERT INTO activities (id, tenant_id, title, description, type, status, priority, start_date, owner_id, created_by)
VALUES ('act-mendi-ta1', 3, 'Preparar cartel del Mercadillo', 'Diseñar y enviar a imprenta el cartel del mercadillo de primavera', 'TASK', 'DONE', 'HIGH', TIMESTAMP '2026-04-10 00:00:00', 'demo-mendi-laura', 'demo-mendi-laura');

INSERT INTO activities (id, tenant_id, title, type, status, priority, start_date, owner_id, created_by)
VALUES ('act-mendi-ta2', 3, 'Contactar ayuntamiento para permisos mercadillo', 'TASK', 'IN_PROGRESS', 'HIGH', TIMESTAMP '2026-04-15 00:00:00', 'demo-mendi-admin', 'demo-mendi-admin');

INSERT INTO activities (id, tenant_id, title, type, status, priority, owner_id, created_by)
VALUES ('act-mendi-ta3', 3, 'Revisar acta de la última asamblea', 'TASK', 'PENDING', 'LOW', 'demo-mendi-pablo', 'demo-mendi-pablo');

-- === REUNIONES ===
INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by)
VALUES ('act-mendi-re1', 3, 'Junta Vecinal - Abril', 'Temas: obras en la calle Mayor, ruido nocturno, presupuesto mercadillo.', 'MEETING', 'PENDING', TIMESTAMP '2026-04-18 20:00:00', 'Sala de Reuniones', 'demo-mendi-admin', 'demo-mendi-admin');

INSERT INTO activities (id, tenant_id, title, description, type, status, start_date, location, owner_id, created_by)
VALUES ('act-mendi-re2', 3, 'Comisión de Fiestas del Barrio', 'Planificación fiestas patronales septiembre.', 'MEETING', 'PENDING', TIMESTAMP '2026-05-02 19:00:00', 'Sala de Reuniones', 'demo-mendi-laura', 'demo-mendi-laura');

COMMIT;
