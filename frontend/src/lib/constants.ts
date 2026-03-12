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
  { label: "Miembros", href: "/miembros", icon: "Users" },
  { label: "Grupos", href: "/grupos", icon: "UsersRound" },
  { label: "Documentos", href: "/documentos", icon: "FileText" },
  { label: "Galería", href: "/galeria", icon: "Image" },
  { label: "Contactos", href: "/contactos", icon: "Contact" },
  { label: "Asistente IA", href: "/asistente", icon: "BotMessageSquare" },
  { label: "Guia de uso", href: "/guia", icon: "BookOpen" },
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

export const ACTIVITY_STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  PENDING: { label: "Pendiente", color: "bg-amber-100 text-amber-800 border-amber-200", icon: "Clock" },
  IN_PROGRESS: { label: "En Progreso", color: "bg-blue-100 text-blue-800 border-blue-200", icon: "Loader" },
  DONE: { label: "Hecho", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "CircleCheck" },
};

export const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  TASK: { label: "Tarea", color: "bg-blue-100 text-blue-800 border-blue-200" },
  MEETING: { label: "Reunion", color: "bg-amber-100 text-amber-800 border-amber-200" },
  EVENT: { label: "Evento", color: "bg-purple-100 text-purple-800 border-purple-200" },
  OTHER: { label: "Otros", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  MEMBER: "Miembro",
};

export const CONTACT_CATEGORY_OPTIONS = [
  "Colaborador/a",
  "Proveedor/a",
  "Institución",
  "Ponente",
  "Medio de comunicación",
  "Asociación",
  "Político/a",
  "Vecino/a",
  "Otro",
];

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  READY: "Listo",
  ERROR: "Error",
};
