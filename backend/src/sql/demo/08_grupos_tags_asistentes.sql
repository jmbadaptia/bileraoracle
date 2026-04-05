-- ============================================================
-- Demo data: Grupos de trabajo, Tags, Asistentes a actividades
-- ============================================================

-- === GRUPOS: ITSASALDE (tenant 2) ===
INSERT INTO groups (id, tenant_id, name, description)
VALUES ('gr-itsa-junta', 61, 'Junta Directiva', 'Órgano de gobierno de la asociación');

INSERT INTO groups (id, tenant_id, name, description)
VALUES ('gr-itsa-fiestas', 61, 'Comisión de Fiestas', 'Organización de eventos y fiestas populares');

INSERT INTO groups (id, tenant_id, name, description)
VALUES ('gr-itsa-cultura', 61, 'Comisión de Cultura', 'Programación cultural: charlas, cursos, talleres');

-- Miembros de Junta Directiva
INSERT INTO group_members (group_id, user_id) VALUES ('gr-itsa-junta', 'demo-itsa-admin');
INSERT INTO group_members (group_id, user_id) VALUES ('gr-itsa-junta', 'demo-itsa-jokin');
INSERT INTO group_members (group_id, user_id) VALUES ('gr-itsa-junta', 'demo-itsa-amaia');

-- Miembros de Comisión de Fiestas
INSERT INTO group_members (group_id, user_id) VALUES ('gr-itsa-fiestas', 'demo-itsa-jokin');
INSERT INTO group_members (group_id, user_id) VALUES ('gr-itsa-fiestas', 'demo-itsa-ander');

-- Miembros de Comisión de Cultura
INSERT INTO group_members (group_id, user_id) VALUES ('gr-itsa-cultura', 'demo-itsa-amaia');
INSERT INTO group_members (group_id, user_id) VALUES ('gr-itsa-cultura', 'demo-itsa-admin');

-- === GRUPOS: MENDIZABAL (tenant 3) ===
INSERT INTO groups (id, tenant_id, name, description)
VALUES ('gr-mendi-junta', 62, 'Junta Vecinal', 'Junta directiva de la asociación vecinal');

INSERT INTO groups (id, tenant_id, name, description)
VALUES ('gr-mendi-fiestas', 62, 'Comisión de Fiestas', 'Organización fiestas patronales y eventos del barrio');

-- Miembros Junta Vecinal
INSERT INTO group_members (group_id, user_id) VALUES ('gr-mendi-junta', 'demo-mendi-admin');
INSERT INTO group_members (group_id, user_id) VALUES ('gr-mendi-junta', 'demo-mendi-laura');
INSERT INTO group_members (group_id, user_id) VALUES ('gr-mendi-junta', 'demo-mendi-pablo');

-- Miembros Comisión de Fiestas
INSERT INTO group_members (group_id, user_id) VALUES ('gr-mendi-fiestas', 'demo-mendi-laura');
INSERT INTO group_members (group_id, user_id) VALUES ('gr-mendi-fiestas', 'demo-mendi-pablo');

-- === TAGS: ITSASALDE (tenant 2) ===
INSERT INTO tags (id, tenant_id, name, color) VALUES ('tag-itsa-gastro', 61, 'Gastronomía', '#ef4444');
INSERT INTO tags (id, tenant_id, name, color) VALUES ('tag-itsa-cultura', 61, 'Cultura', '#8b5cf6');
INSERT INTO tags (id, tenant_id, name, color) VALUES ('tag-itsa-natura', 61, 'Naturaleza', '#22c55e');
INSERT INTO tags (id, tenant_id, name, color) VALUES ('tag-itsa-musica', 61, 'Música', '#f59e0b');

-- Tags en actividades
INSERT INTO activity_tags (activity_id, tag_id) VALUES ('act-itsa-ev1', 'tag-itsa-gastro');
INSERT INTO activity_tags (activity_id, tag_id) VALUES ('act-itsa-ev1', 'tag-itsa-musica');
INSERT INTO activity_tags (activity_id, tag_id) VALUES ('act-itsa-ev2', 'tag-itsa-cultura');
INSERT INTO activity_tags (activity_id, tag_id) VALUES ('act-itsa-ev3', 'tag-itsa-natura');
INSERT INTO activity_tags (activity_id, tag_id) VALUES ('act-itsa-cu1', 'tag-itsa-gastro');
INSERT INTO activity_tags (activity_id, tag_id) VALUES ('act-itsa-cu2', 'tag-itsa-cultura');

-- === TAGS: MENDIZABAL (tenant 3) ===
INSERT INTO tags (id, tenant_id, name, color) VALUES ('tag-mendi-social', 62, 'Social', '#06b6d4');
INSERT INTO tags (id, tenant_id, name, color) VALUES ('tag-mendi-senior', 62, 'Mayores', '#f97316');
INSERT INTO tags (id, tenant_id, name, color) VALUES ('tag-mendi-eco', 62, 'Ecología', '#22c55e');

INSERT INTO activity_tags (activity_id, tag_id) VALUES ('act-mendi-ev1', 'tag-mendi-social');
INSERT INTO activity_tags (activity_id, tag_id) VALUES ('act-mendi-cu1', 'tag-mendi-eco');
INSERT INTO activity_tags (activity_id, tag_id) VALUES ('act-mendi-cu2', 'tag-mendi-senior');

-- === ASISTENTES a reuniones y eventos ===

-- Junta Directiva Abril (Itsasalde)
INSERT INTO activity_attendees (activity_id, user_id) VALUES ('act-itsa-re1', 'demo-itsa-admin');
INSERT INTO activity_attendees (activity_id, user_id) VALUES ('act-itsa-re1', 'demo-itsa-jokin');
INSERT INTO activity_attendees (activity_id, user_id) VALUES ('act-itsa-re1', 'demo-itsa-amaia');
INSERT INTO activity_attendees (activity_id, user_id) VALUES ('act-itsa-re1', 'demo-itsa-ander');

-- Comisión de Fiestas (Itsasalde)
INSERT INTO activity_attendees (activity_id, user_id) VALUES ('act-itsa-re2', 'demo-itsa-jokin');
INSERT INTO activity_attendees (activity_id, user_id) VALUES ('act-itsa-re2', 'demo-itsa-ander');
INSERT INTO activity_attendees (activity_id, user_id) VALUES ('act-itsa-re2', 'demo-itsa-admin');

-- Junta Vecinal Abril (Mendizabal)
INSERT INTO activity_attendees (activity_id, user_id) VALUES ('act-mendi-re1', 'demo-mendi-admin');
INSERT INTO activity_attendees (activity_id, user_id) VALUES ('act-mendi-re1', 'demo-mendi-laura');
INSERT INTO activity_attendees (activity_id, user_id) VALUES ('act-mendi-re1', 'demo-mendi-pablo');

-- Colaboradores en eventos
INSERT INTO activity_contacts (activity_id, contact_id, role) VALUES ('act-itsa-ev1', 'ct-itsa-musico', 'Artista invitada');
INSERT INTO activity_contacts (activity_id, contact_id, role) VALUES ('act-itsa-ev2', 'ct-itsa-ayto', 'Patrocinador');

COMMIT;
