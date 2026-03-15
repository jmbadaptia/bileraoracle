-- Migrate vector columns from 768 (Gemini) to 1024 (Cohere embed-multilingual-v3)
-- Drop existing embeddings (they need to be regenerated with the new model)

UPDATE activities SET embedding = NULL;
UPDATE documents SET embedding = NULL;
UPDATE albums SET embedding = NULL;

-- Recreate columns with new dimensions
ALTER TABLE activities DROP COLUMN embedding;
ALTER TABLE activities ADD (embedding VECTOR(1024, FLOAT32));

ALTER TABLE documents DROP COLUMN embedding;
ALTER TABLE documents ADD (embedding VECTOR(1024, FLOAT32));

ALTER TABLE albums DROP COLUMN embedding;
ALTER TABLE albums ADD (embedding VECTOR(1024, FLOAT32));

-- document_chunks table
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE document_chunks DROP COLUMN embedding';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE document_chunks ADD (embedding VECTOR(1024, FLOAT32))';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
