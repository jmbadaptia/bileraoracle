export const APP_NAME = "PSN - PSOE Valle de Egüés Eguesibar";

export const NAV_ITEMS = [
  { label: "Panel Principal", href: "/", icon: "LayoutDashboard" },
  {
    label: "Gestión",
    href: "/actividades",
    icon: "CalendarDays",
    children: [
      { label: "Tareas", href: "/actividades/tareas" },
      { label: "Calendario", href: "/actividades" },
      { label: "Historial", href: "/actividades/historial" },
    ],
  },
  { label: "Documentos", href: "/documentos", icon: "FileText" },
  { label: "Galería", href: "/galeria", icon: "Image" },
  { label: "Ordenanzas", href: "/ordenanzas", icon: "Scale" },
  { label: "Consulta IA", href: "/busqueda", icon: "Search" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: "Administración", href: "/admin", icon: "Shield" },
  { label: "Equipo", href: "/admin/usuarios", icon: "Users" },
] as const;

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  PLENARY: "Pleno",
  COMMISSION: "Comisión",
  MEETING: "Reunión",
  VISIT: "Visita",
  EVENT: "Evento",
  OTHER: "Otros",
};

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  TODO: "Por Hacer",
  IN_PROGRESS: "En Progreso",
  DONE: "Hecho",
};

export const SESSION_TYPE_LABELS: Record<string, string> = {
  COMMISSION: "Comisión",
  PLENARY: "Pleno",
  GOVERNMENT_BOARD: "Junta de Gobierno",
  PRESS_NOTE: "Nota de Prensa",
  ORDINANCE: "Ordenanza",
  OTHER: "Otro",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  MEMBER: "Miembro",
};

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  READY: "Listo",
  ERROR: "Error",
};
