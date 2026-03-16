-- Run as SYSTEM to grant privileges to bilera user
-- These are needed for VPD and application context

ALTER USER bilera QUOTA UNLIMITED ON USERS;

GRANT CREATE SESSION TO bilera;
GRANT CREATE TABLE TO bilera;
GRANT CREATE SEQUENCE TO bilera;
GRANT CREATE PROCEDURE TO bilera;
GRANT CREATE ANY CONTEXT TO bilera;
GRANT CREATE SYNONYM TO bilera;
GRANT EXECUTE ON DBMS_SESSION TO bilera;
GRANT EXECUTE ON DBMS_RLS TO bilera;

-- Create bilera_admin schema for identity isolation
CREATE USER bilera_admin IDENTIFIED BY bilera_admin
  DEFAULT TABLESPACE USERS
  QUOTA UNLIMITED ON USERS;

GRANT CREATE SESSION TO bilera_admin;
GRANT CREATE TABLE TO bilera_admin;
GRANT CREATE SEQUENCE TO bilera_admin;
