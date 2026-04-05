-- ============================================================
-- Demo data: Socios (Members registry)
-- ============================================================

-- ITSASALDE (tenant 2) — 8 socios
INSERT INTO socios (id, tenant_id, nombre, apellidos, dni, email, telefono, direccion, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-itsa-01', 2, 'Ainhoa', 'Zabala Urrutia', '72345678A', 'ainhoa.zabala@gmail.com', '688 100 001', 'Kale Nagusia 12, Getaria', '001', DATE '2020-03-15', 'ACTIVO', 'demo-itsa-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, dni, email, telefono, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-itsa-02', 2, 'Mikel', 'Aguirre Etxebarria', '72345679B', 'mikel.aguirre@hotmail.com', '688 100 002', '002', DATE '2020-03-15', 'ACTIVO', 'demo-itsa-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, email, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-itsa-03', 2, 'Nerea', 'Ibáñez Galdós', 'nerea.ibanez@gmail.com', '003', DATE '2021-01-10', 'ACTIVO', 'demo-itsa-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, telefono, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-itsa-04', 2, 'Gorka', 'Lizarralde', '688 100 004', '004', DATE '2021-06-01', 'ACTIVO', 'demo-itsa-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-itsa-05', 2, 'Itziar', 'Mendizábal Arana', '005', DATE '2022-02-14', 'ACTIVO', 'demo-itsa-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, numero_socio, fecha_alta, fecha_baja, estado, notas, created_by)
VALUES ('so-itsa-06', 2, 'Patxi', 'Uriarte', '006', DATE '2020-03-15', DATE '2024-12-31', 'BAJA', 'Se mudó a Madrid', 'demo-itsa-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, email, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-itsa-07', 2, 'Leire', 'Otxoa Bergara', 'leire.otxoa@gmail.com', '007', DATE '2023-09-01', 'ACTIVO', 'demo-itsa-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-itsa-08', 2, 'Unai', 'Aranburu', '008', DATE '2024-01-15', 'ACTIVO', 'demo-itsa-admin');

-- MENDIZABAL (tenant 3) — 6 socios
INSERT INTO socios (id, tenant_id, nombre, apellidos, dni, email, telefono, direccion, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-mendi-01', 3, 'Carmen', 'López Fernández', '50123456C', 'carmen.lopez@gmail.com', '611 200 001', 'Calle Mayor 5, 3ºB', 'M-001', DATE '2019-06-01', 'ACTIVO', 'demo-mendi-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, email, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-mendi-02', 3, 'Fernando', 'Martínez Díaz', 'fernando.md@outlook.com', 'M-002', DATE '2019-06-01', 'ACTIVO', 'demo-mendi-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-mendi-03', 3, 'Rosa', 'Jiménez Navarro', 'M-003', DATE '2020-02-10', 'ACTIVO', 'demo-mendi-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, telefono, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-mendi-04', 3, 'Antonio', 'Pérez Herrero', '611 200 004', 'M-004', DATE '2021-01-01', 'ACTIVO', 'demo-mendi-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, numero_socio, fecha_alta, estado, created_by)
VALUES ('so-mendi-05', 3, 'Elena', 'Sánchez Moreno', 'M-005', DATE '2022-09-15', 'ACTIVO', 'demo-mendi-admin');

INSERT INTO socios (id, tenant_id, nombre, apellidos, numero_socio, fecha_alta, fecha_baja, estado, created_by)
VALUES ('so-mendi-06', 3, 'Javier', 'Romero Gil', 'M-006', DATE '2020-03-01', DATE '2023-06-30', 'BAJA', 'demo-mendi-admin');

COMMIT;
