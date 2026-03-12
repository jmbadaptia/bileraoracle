-- ============================================================
-- Bilera Oracle - Vector Search columns
-- ============================================================

-- Add embedding columns (Gemini embedding-001 con dimensions=768)
ALTER TABLE activities ADD (embedding VECTOR(768, FLOAT32));
ALTER TABLE documents ADD (embedding VECTOR(768, FLOAT32));
ALTER TABLE albums ADD (embedding VECTOR(768, FLOAT32));
