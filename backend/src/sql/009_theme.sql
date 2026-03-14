-- Add theme column to tenants
ALTER TABLE tenants ADD (theme VARCHAR2(20) DEFAULT 'default');
