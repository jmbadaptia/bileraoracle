-- ============================================================
-- Demo data: Sesiones de cursos e Inscripciones
-- ============================================================

-- === SESIONES: Curso de Cocina Vasca (act-itsa-cu1) — 4 sesiones ===
INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
VALUES ('ses-cu1-01', 2, 'act-itsa-cu1', 1, DATE '2026-04-28', '18:00', '21:00', 'Marmitako y ensalada de bonito', 'Preparación del marmitako tradicional con bonito fresco');

INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
VALUES ('ses-cu1-02', 2, 'act-itsa-cu1', 2, DATE '2026-05-05', '18:00', '21:00', 'Bacalao al pil-pil', 'Técnica del pil-pil, desalado del bacalao');

INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
VALUES ('ses-cu1-03', 2, 'act-itsa-cu1', 3, DATE '2026-05-12', '18:00', '21:00', 'Pintxos variados', 'Gilda, txangurro, croquetas de txipirones');

INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
VALUES ('ses-cu1-04', 2, 'act-itsa-cu1', 4, DATE '2026-05-19', '18:00', '21:00', 'Postres vascos', 'Pantxineta, goxua y tarta de queso');

-- === SESIONES: Taller de Fotografía (act-itsa-cu2) — 1 sesión ===
INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
VALUES ('ses-cu2-01', 2, 'act-itsa-cu2', 1, DATE '2026-05-03', '10:00', '14:00', 'Salida fotográfica por la costa', 'Composición, luz natural, uso del trípode');

-- === SESIONES: Taller Huerto Urbano (act-mendi-cu1) — 2 sesiones ===
INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
VALUES ('ses-mcu1-01', 3, 'act-mendi-cu1', 1, DATE '2026-05-08', '17:00', '19:00', 'Diseño del huerto y preparación', 'Tipos de recipientes, sustratos, planificación');

INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
VALUES ('ses-mcu1-02', 3, 'act-mendi-cu1', 2, DATE '2026-05-15', '17:00', '19:00', 'Siembra y mantenimiento', 'Siembra directa, trasplante, riego y plagas');

-- === SESIONES: Informática para Mayores (act-mendi-cu2) — 3 sesiones ===
INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
VALUES ('ses-mcu2-01', 3, 'act-mendi-cu2', 1, DATE '2026-04-21', '10:00', '12:00', 'El móvil y WhatsApp', 'Configuración, contactos, enviar mensajes y fotos');

INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
VALUES ('ses-mcu2-02', 3, 'act-mendi-cu2', 2, DATE '2026-04-28', '10:00', '12:00', 'Email y navegador', 'Crear cuenta Gmail, buscar información, seguridad básica');

INSERT INTO course_sessions (id, tenant_id, activity_id, session_num, session_date, time_start, time_end, title, content)
VALUES ('ses-mcu2-03', 3, 'act-mendi-cu2', 3, DATE '2026-05-05', '10:00', '12:00', 'Trámites online', 'Cita previa médico, Cl@ve, banca online');

-- === INSCRIPCIONES: Curso de Cocina Vasca (5 inscritos de 12 plazas) ===
INSERT INTO enrollments (id, tenant_id, activity_id, name, email, phone, status, cancel_token, position, confirmed_at)
VALUES (SYS_GUID(), 2, 'act-itsa-cu1', 'Ainhoa Zabala', 'ainhoa.zabala@gmail.com', '688 100 001', 'CONFIRMED', SYS_GUID(), 1, SYSTIMESTAMP);

INSERT INTO enrollments (id, tenant_id, activity_id, name, email, phone, status, cancel_token, position, confirmed_at)
VALUES (SYS_GUID(), 2, 'act-itsa-cu1', 'Mikel Aguirre', 'mikel.aguirre@hotmail.com', '688 100 002', 'CONFIRMED', SYS_GUID(), 2, SYSTIMESTAMP);

INSERT INTO enrollments (id, tenant_id, activity_id, name, email, status, cancel_token, position, confirmed_at)
VALUES (SYS_GUID(), 2, 'act-itsa-cu1', 'Nerea Ibáñez', 'nerea.ibanez@gmail.com', 'CONFIRMED', SYS_GUID(), 3, SYSTIMESTAMP);

INSERT INTO enrollments (id, tenant_id, activity_id, name, email, status, cancel_token, position, confirmed_at)
VALUES (SYS_GUID(), 2, 'act-itsa-cu1', 'Leire Otxoa', 'leire.otxoa@gmail.com', 'CONFIRMED', SYS_GUID(), 4, SYSTIMESTAMP);

INSERT INTO enrollments (id, tenant_id, activity_id, name, email, status, cancel_token, position)
VALUES (SYS_GUID(), 2, 'act-itsa-cu1', 'Jon Elorza', 'jon.elorza@gmail.com', 'PENDING', SYS_GUID(), 5);

-- === INSCRIPCIONES: Taller de Fotografía (3 inscritos de 15) ===
INSERT INTO enrollments (id, tenant_id, activity_id, name, email, status, cancel_token, position, confirmed_at)
VALUES (SYS_GUID(), 2, 'act-itsa-cu2', 'Gorka Lizarralde', 'gorka.l@gmail.com', 'CONFIRMED', SYS_GUID(), 1, SYSTIMESTAMP);

INSERT INTO enrollments (id, tenant_id, activity_id, name, email, status, cancel_token, position, confirmed_at)
VALUES (SYS_GUID(), 2, 'act-itsa-cu2', 'Itziar Mendizábal', 'itziar.mendi@gmail.com', 'CONFIRMED', SYS_GUID(), 2, SYSTIMESTAMP);

INSERT INTO enrollments (id, tenant_id, activity_id, name, email, status, cancel_token, position, confirmed_at)
VALUES (SYS_GUID(), 2, 'act-itsa-cu2', 'Unai Aranburu', 'unai.aran@gmail.com', 'CONFIRMED', SYS_GUID(), 3, SYSTIMESTAMP);

-- === INSCRIPCIONES: Taller Huerto Urbano (4 inscritos de 25) ===
INSERT INTO enrollments (id, tenant_id, activity_id, name, email, status, cancel_token, position, confirmed_at)
VALUES (SYS_GUID(), 3, 'act-mendi-cu1', 'Carmen López', 'carmen.lopez@gmail.com', 'CONFIRMED', SYS_GUID(), 1, SYSTIMESTAMP);

INSERT INTO enrollments (id, tenant_id, activity_id, name, email, status, cancel_token, position, confirmed_at)
VALUES (SYS_GUID(), 3, 'act-mendi-cu1', 'Fernando Martínez', 'fernando.md@outlook.com', 'CONFIRMED', SYS_GUID(), 2, SYSTIMESTAMP);

INSERT INTO enrollments (id, tenant_id, activity_id, name, email, status, cancel_token, position, confirmed_at)
VALUES (SYS_GUID(), 3, 'act-mendi-cu1', 'Rosa Jiménez', 'rosa.jimenez@gmail.com', 'CONFIRMED', SYS_GUID(), 3, SYSTIMESTAMP);

INSERT INTO enrollments (id, tenant_id, activity_id, name, email, status, cancel_token, position)
VALUES (SYS_GUID(), 3, 'act-mendi-cu1', 'Antonio Pérez', 'antonio.perez@gmail.com', 'PENDING', SYS_GUID(), 4);

COMMIT;
