-- ============================================================
-- 024: Merge TALLER type into CURSO
-- Cursos y talleres son técnicamente idénticos (mismo wizard,
-- misma lógica de inscripciones). Fusionamos para simplificar UX.
-- ============================================================

UPDATE activities SET type = 'CURSO' WHERE type = 'TALLER';
COMMIT;
