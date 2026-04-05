export const APP_NAME = "Bilera";

export const NAV_SECTIONS = [
  {
    label: "",
    items: [
      { label: "Panel Principal", href: "/", icon: "LayoutDashboard" },
    ],
  },
  {
    label: "Gestión",
    items: [
      { label: "Actividades", href: "/actividades", icon: "CalendarDays" },
      { label: "Cursos y talleres", href: "/actividades?inscripciones=1", icon: "ClipboardList" },
      { label: "Espacios", href: "/espacios", icon: "Building2" },
    ],
  },
  {
    label: "Personas",
    items: [
      { label: "Socios", href: "/socios", icon: "UserCheck" },
      { label: "Colaboradores", href: "/contactos", icon: "Contact" },
      { label: "Grupos de trabajo", href: "/grupos", icon: "UsersRound" },
    ],
  },
  {
    label: "Contenido",
    items: [
      { label: "Documentos", href: "/documentos", icon: "FileText" },
      { label: "Galería", href: "/galeria", icon: "Image" },
    ],
  },
  {
    label: "Ayuda",
    items: [
      { label: "Guía de uso", href: "/guia", icon: "BookOpen" },
      { label: "Asistente IA", href: "/asistente", icon: "BotMessageSquare" },
    ],
  },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: "Configuración", href: "/admin", icon: "Settings" },
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

/** Shorthand color map derived from ACTIVITY_TYPE_CONFIG */
export const TYPE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(ACTIVITY_TYPE_CONFIG).map(([k, v]) => [k, v.color]),
);

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
