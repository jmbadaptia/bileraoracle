-- Document chunks table for RAG
CREATE TABLE document_chunks (
  id           VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id    NUMBER         NOT NULL,
  document_id  VARCHAR2(36)   NOT NULL,
  chunk_index  NUMBER         NOT NULL,
  content      CLOB           NOT NULL,
  embedding    VECTOR(768, FLOAT32),
  created_at   TIMESTAMP      DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_chunk_doc FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_tenant ON document_chunks(tenant_id);

-- Add processing columns to documents
ALTER TABLE documents ADD (extracted_text CLOB);
ALTER TABLE documents ADD (chunk_count NUMBER DEFAULT 0);
ALTER TABLE documents ADD (processing_error VARCHAR2(1000));

-- VPD policies for chunks
BEGIN DBMS_RLS.ADD_POLICY(USER,'DOCUMENT_CHUNKS','chunks_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'DOCUMENT_CHUNKS','chunks_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'DOCUMENT_CHUNKS','chunks_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/
