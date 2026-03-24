-- ============================================================
-- Seed: Bilera User Guide as SYSTEM document
-- Run per tenant. Replace :tenantId with the tenant ID.
-- The document processor will chunk and embed it automatically.
-- ============================================================

DECLARE
  v_id VARCHAR2(36) := SYS_GUID();
  v_tenant_id NUMBER := :tenantId;
  v_text CLOB;
BEGIN
  -- Check if guide already exists for this tenant
  SELECT COUNT(*) INTO v_tenant_id FROM documents
    WHERE tenant_id = v_tenant_id AND visibility = 'SYSTEM' AND title = 'Guía de uso de Bilera';
  IF v_tenant_id > 0 THEN
    RETURN;
  END IF;

  v_text := 'GUÍA DE USO DE BILERA

Panel Principal: Es la página de inicio. Muestra un resumen rápido: miembros activos, eventos del mes, documentos subidos y próximos eventos. Cada tarjeta es clicable.

Tareas: Las tareas se muestran en un tablero Kanban con tres columnas: Pendiente, En Progreso y Hecho. Arrastra las tarjetas para cambiar su estado. Usa filtros de persona y tipo para encontrar tareas.

Eventos: Aquí se registran reuniones, actos, visitas, etc. Se pueden ver en lista o calendario mensual. Para crear un evento, pulsa Nuevo, rellena título, tipo, fecha, lugar y descripción, y añade participantes. En el detalle del evento hay notas/acta a la izquierda y detalles/participantes a la derecha. Puedes adjuntar documentos y resumir con IA.

Cursos y Talleres: Gestiona cursos y actividades con inscripción pública. El asistente de 3 pasos guía la creación: datos del curso, sesiones y resumen. Las sesiones se pueden generar automáticamente con recurrencias (semanal, mensual). Se puede subir un PDF del programa y la IA rellena los campos. Modos de inscripción: FIFO (por orden), sorteo o lista de espera. Cada curso tiene un enlace público para compartir. Los inscritos reciben confirmación por email.

Espacios y Reservas: Gestiona salas y espacios con nombre, ubicación, capacidad y color. Las reservas se ven en calendario con detección de conflictos. Al crear un curso se puede seleccionar un espacio y el aforo se ajusta automáticamente.

Colaboradores: Agenda de contactos externos (proveedores, ponentes, instituciones). Cada contacto tiene nombre, email, teléfono, web y categoría. Se pueden vincular a eventos como participantes externos o asignar como instructores de cursos. Para crear un colaborador, ve a la sección Colaboradores y pulsa Nuevo.

Grupos de trabajo: Para organizar comisiones o equipos (ej: Comisión de fiestas, Equipo de comunicación). Cada grupo tiene nombre, descripción y lista de miembros. Los administradores crean y gestionan grupos.

Documentos: Repositorio central. Soporta PDF, Word, texto. Para subir, pulsa Subir, pon título, selecciona categorías y arrastra el archivo. El sistema procesa automáticamente el contenido para hacerlo buscable. Categorías disponibles: Actas, Normativa, Facturas, Subvenciones, Contratos, Certificados, Comunicados, Informes, Proyectos, Otros. Se pueden vincular a eventos.

Galería: Álbumes de fotos. Crea álbumes con título y descripción, sube múltiples fotos. Los álbumes se pueden vincular a eventos.

Asistente IA: Chat inteligente con acceso a toda la información de la asociación. Puedes preguntar sobre documentos, eventos, cursos, etc. Ejemplos: "¿Qué eventos tenemos esta semana?", "Hazme un resumen del programa del curso de cocina", "¿Cuánto costó la factura de X?". El asistente cita las fuentes que utiliza. Las conversaciones se guardan automáticamente.

Administración: Los administradores acceden a Configuración (logo, tema de colores), Usuarios (gestionar miembros, invitaciones, roles), Plan y uso (recursos usados), y Uso de IA (desglose de consumo mensual). Para invitar miembros, ve a Configuración > Usuarios.

Roles: Administrador (puede crear, editar, eliminar) y Miembro (puede ver y participar). El menú lateral es colapsable. La mayoría de páginas tienen buscador y filtros con vista cuadrícula/lista.';

  INSERT INTO documents (id, tenant_id, title, description, file_path, file_name, file_type, file_size, status, visibility, uploaded_by, extracted_text)
  VALUES (v_id, :tenantId, 'Guía de uso de Bilera', 'Manual de uso de la plataforma Bilera', '/system/guide.txt', 'guia-bilera.txt', 'text/plain', 0, 'READY', 'SYSTEM', (SELECT id FROM users WHERE ROWNUM = 1), v_text);

  COMMIT;
END;
/
