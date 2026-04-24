export const APP_NAME = "Bilera";

export const NAV_SECTIONS = [
  {
    label: "",
    items: [
      { label: "Panel Principal", href: "/", icon: "LayoutDashboard" },
    ],
  },
  {
    label: "Organización",
    items: [
      { label: "Actividades", href: "/actividades", icon: "CalendarDays" },
      { label: "Tareas", href: "/tareas", icon: "CheckSquare" },
      { label: "Reuniones", href: "/reuniones", icon: "Handshake" },
      { label: "Espacios", href: "/espacios", icon: "Building2" },
    ],
  },
  {
    label: "",
    items: [
      { label: "Calendario", href: "/calendario", icon: "Calendar" },
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
  CURSO: "Curso / Taller",
  // TALLER kept only for legacy data. UI treats it as CURSO.
  TALLER: "Curso / Taller",
  OTHER: "Otros",
};

/** Types shown in the public Actividades section (excludes internal types) */
export const PUBLIC_ACTIVITY_TYPES = ["EVENT", "CURSO", "OTHER"] as const;

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

/** Pipeline for public activities (EVENT, TALLER, OTHER) */
export const ACTIVITY_PIPELINE_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  PUBLISHED: "Publicado",
  FINISHED: "Finalizado",
  ARCHIVED: "Archivado",
};

export const ACTIVITY_PIPELINE_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "bg-gray-100 text-gray-700 border-gray-200" },
  IN_REVIEW: { label: "En revisión", color: "bg-amber-100 text-amber-800 border-amber-200" },
  PUBLISHED: { label: "Publicado", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  FINISHED: { label: "Finalizado", color: "bg-blue-100 text-blue-800 border-blue-200" },
  ARCHIVED: { label: "Archivado", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

export const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  TASK: { label: "Tarea", color: "bg-blue-100 text-blue-800 border-blue-200" },
  MEETING: { label: "Reunión", color: "bg-sky-100 text-sky-800 border-sky-200" },
  EVENT: { label: "Evento", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  CURSO: { label: "Curso / Taller", color: "bg-red-100 text-red-800 border-red-200" },
  TALLER: { label: "Curso / Taller", color: "bg-red-100 text-red-800 border-red-200" },
  OTHER: { label: "Otros", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

/** Shorthand color map derived from ACTIVITY_TYPE_CONFIG */
export const TYPE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(ACTIVITY_TYPE_CONFIG).map(([k, v]) => [k, v.color]),
);

export const PRIORITY_LABELS: Record<string, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  HIGH: { label: "Alta", color: "bg-red-100 text-red-800 border-red-200", dot: "bg-red-500" },
  MEDIUM: { label: "Media", color: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  LOW: { label: "Baja", color: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
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
