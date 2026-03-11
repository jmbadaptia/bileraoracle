-- Run as SYSTEM to grant privileges to bilera user
-- These are needed for VPD and application context

ALTER USER bilera QUOTA UNLIMITED ON USERS;

GRANT CREATE SESSION TO bilera;
GRANT CREATE TABLE TO bilera;
GRANT CREATE SEQUENCE TO bilera;
GRANT CREATE PROCEDURE TO bilera;
GRANT CREATE ANY CONTEXT TO bilera;
GRANT EXECUTE ON DBMS_SESSION TO bilera;
GRANT EXECUTE ON DBMS_RLS TO bilera;
