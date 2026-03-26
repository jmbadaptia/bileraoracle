-- ============================================================
-- Socios (members/associates of the association)
-- ============================================================

CREATE TABLE socios (
  id             VARCHAR2(36)   DEFAULT SYS_GUID() PRIMARY KEY,
  tenant_id      NUMBER         NOT NULL,
  nombre         VARCHAR2(200)  NOT NULL,
  apellidos      VARCHAR2(200),
  dni            VARCHAR2(20),
  email          VARCHAR2(255),
  telefono       VARCHAR2(100),
  direccion      VARCHAR2(500),
  numero_socio   VARCHAR2(50),
  fecha_alta     DATE           DEFAULT SYSDATE,
  fecha_baja     DATE,
  estado         VARCHAR2(20)   DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'BAJA')),
  notas          CLOB,
  created_by     VARCHAR2(36)   NOT NULL,
  created_at     TIMESTAMP      DEFAULT SYSTIMESTAMP,
  updated_at     TIMESTAMP      DEFAULT SYSTIMESTAMP
);

CREATE INDEX idx_socios_tenant ON socios(tenant_id);
CREATE INDEX idx_socios_estado ON socios(tenant_id, estado);

-- VPD
BEGIN DBMS_RLS.ADD_POLICY(USER,'SOCIOS','soc_sel_vpd',USER,'VPD_TENANT_POLICY','SELECT'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'SOCIOS','soc_upd_vpd',USER,'VPD_TENANT_POLICY','UPDATE'); END;
/
BEGIN DBMS_RLS.ADD_POLICY(USER,'SOCIOS','soc_del_vpd',USER,'VPD_TENANT_POLICY','DELETE'); END;
/
