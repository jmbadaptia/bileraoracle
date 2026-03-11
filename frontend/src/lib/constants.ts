export const APP_NAME = "Bilera";

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
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: "Administración", href: "/admin", icon: "Shield" },
  { label: "Equipo", href: "/admin/usuarios", icon: "Users" },
] as const;

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  TASK: "Tarea",
  MEETING: "Reunión",
  EVENT: "Evento",
  OTHER: "Otros",
};

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En Progreso",
  DONE: "Hecho",
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
