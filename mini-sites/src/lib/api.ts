const BACKEND_URL = process.env.BACKEND_URL || "http://backend:4000";
export const PUBLIC_API_URL = process.env.PUBLIC_API_URL || "http://localhost:4000/api";
export const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || "http://localhost:3001";

export type SiteData = {
  tenant: {
    id: number;
    name: string;
    slug: string;
    theme: string;
    hasLogo: boolean;
    hasHero: boolean;
  };
  config: {
    hero?: { title?: string; subtitle?: string };
    about?: { text?: string };
    gallery?: { enabled?: boolean };
    contacto?: {
      email?: string;
      telefono?: string;
      direccion?: string;
      facebook?: string;
      instagram?: string;
    };
    meta?: {
      categoria?: string;
      ciudad?: string;
      anoFundacion?: number;
      numSocios?: number;
    };
  };
};

type RawEvent = {
  id: string;
  title: string;
  description: string;
  type: string;
  startDate: string;
  location: string;
  hasCover: boolean;
};

type RawCourse = {
  id: string;
  title: string;
  startDate: string | null;
  maxCapacity: number | null;
  price: number | null;
  deadline: string | null;
  hasCover: boolean;
};

type RawPhoto = {
  id: string;
  alt: string;
};

export async function fetchSite(slug: string): Promise<SiteData | null> {
  const res = await fetch(`${BACKEND_URL}/api/public/sites/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return res.json();
}

export async function fetchEvents(slug: string): Promise<RawEvent[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/public/sites/${encodeURIComponent(slug)}/events`);
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.events) ? body.events : [];
  } catch {
    return [];
  }
}

export async function fetchCourses(slug: string): Promise<RawCourse[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/public/sites/${encodeURIComponent(slug)}/courses`);
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.courses) ? body.courses : [];
  } catch {
    return [];
  }
}

export async function fetchGallery(slug: string): Promise<RawPhoto[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/public/sites/${encodeURIComponent(slug)}/gallery`);
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.photos) ? body.photos : [];
  } catch {
    return [];
  }
}

export function heroImageUrl(slug: string): string {
  return `${PUBLIC_API_URL}/public/sites/${encodeURIComponent(slug)}/hero-image`;
}

export function activityCoverUrl(activityId: string): string {
  return `${PUBLIC_API_URL}/activities/${encodeURIComponent(activityId)}/cover`;
}

export function photoThumbnailUrl(photoId: string): string {
  return `${PUBLIC_API_URL}/public/photos/${encodeURIComponent(photoId)}/thumbnail`;
}

export function photoFileUrl(photoId: string): string {
  return `${PUBLIC_API_URL}/public/photos/${encodeURIComponent(photoId)}/file`;
}

export function enrollmentUrl(activityId: string): string {
  return `${PUBLIC_APP_URL}/inscribirse/${encodeURIComponent(activityId)}`;
}

const THEME_HEX: Record<string, string> = {
  default: "#ea580c",
  blue:    "#2563eb",
  green:   "#059669",
  violet:  "#7c3aed",
  rose:    "#db2777",
  teal:    "#0891b2",
};

export function themeHex(theme: string): string {
  return THEME_HEX[theme] || THEME_HEX.default;
}

// ─── SiteConfig shape consumed by components ──────────────────────────
export interface SiteConfig {
  nombre: string;
  subtitulo: string;
  categoria: string;
  ciudad: string;
  socios: number;
  anos: number;
  colorTema: string;
  heroImageUrl: string;
  sobreNosotros?: {
    texto: string[];
    imagenUrl: string;
  };
  eventos?: Array<{
    id: string;
    titulo: string;
    fecha: string;
    hora: string;
    lugar: string;
    descripcion: string;
    categoria: string;
    imagenUrl: string;
  }>;
  cursos?: Array<{
    id: string;
    titulo: string;
    horario: string;
    plazas: number;
    precio: number | null;
    imagenUrl: string;
    inscripcionUrl: string;
  }>;
  galeria?: Array<{
    id: string;
    imagenUrl: string;
    originalUrl: string;
    alt: string;
  }>;
  contacto?: {
    email: string;
    telefono?: string;
    direccion?: string;
    ciudad: string;
    redesSociales?: {
      facebook?: string;
      instagram?: string;
    };
  };
  bloques: {
    sobreNosotros: boolean;
    eventos: boolean;
    cursos: boolean;
    galeria: boolean;
    contacto: boolean;
  };
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const TYPE_LABEL: Record<string, string> = {
  EVENT: "Evento",
  OTHER: "Otro",
  CURSO: "Curso / Taller",
  TALLER: "Curso / Taller",
};

function pad2(n: number) { return String(n).padStart(2, "0"); }

function extractTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function buildCourseSchedule(startDate: string | null, deadline: string | null): string {
  if (startDate && deadline) {
    const s = new Date(startDate);
    const e = new Date(deadline);
    return `${s.getUTCDate()} ${MESES[s.getUTCMonth()]} – ${e.getUTCDate()} ${MESES[e.getUTCMonth()]} ${e.getUTCFullYear()}`;
  }
  if (startDate) {
    const s = new Date(startDate);
    return `Desde ${s.getUTCDate()} ${MESES[s.getUTCMonth()]} ${s.getUTCFullYear()}`;
  }
  return "Fechas por confirmar";
}

export function composeSiteConfig(
  site: SiteData,
  events: RawEvent[],
  courses: RawCourse[],
  photos: RawPhoto[]
): SiteConfig {
  const colorTema = themeHex(site.tenant.theme);
  const nombre = site.config.hero?.title || site.tenant.name;
  const subtitulo = site.config.hero?.subtitle || "Un espacio de encuentro y actividad";
  const aboutParrafos = site.config.about?.text
    ? site.config.about.text.split(/\n\s*\n/).filter(Boolean)
    : [];

  const eventos = events.map((e) => ({
    id: e.id,
    titulo: e.title,
    fecha: e.startDate,
    hora: extractTime(e.startDate),
    lugar: e.location || "",
    descripcion: e.description || "",
    categoria: TYPE_LABEL[e.type] || e.type,
    imagenUrl: e.hasCover
      ? activityCoverUrl(e.id)
      : "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
  }));

  const cursos = courses.map((c) => ({
    id: c.id,
    titulo: c.title,
    horario: buildCourseSchedule(c.startDate, c.deadline),
    plazas: c.maxCapacity || 0,
    precio: c.price != null && c.price > 0 ? c.price : null,
    imagenUrl: c.hasCover
      ? activityCoverUrl(c.id)
      : "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
    inscripcionUrl: enrollmentUrl(c.id),
  }));

  const galeria = photos.map((p) => ({
    id: p.id,
    imagenUrl: photoThumbnailUrl(p.id),
    originalUrl: photoFileUrl(p.id),
    alt: p.alt,
  }));

  const cfgContacto = site.config.contacto;
  const hasContactInfo = !!(
    cfgContacto?.email ||
    cfgContacto?.telefono ||
    cfgContacto?.direccion ||
    cfgContacto?.facebook ||
    cfgContacto?.instagram
  );
  const meta = site.config.meta || {};

  return {
    nombre,
    subtitulo,
    categoria: meta.categoria || "",
    ciudad: meta.ciudad || "",
    socios: meta.numSocios || 0,
    anos: meta.anoFundacion ? Math.max(0, new Date().getFullYear() - meta.anoFundacion) : 0,
    colorTema,
    heroImageUrl: site.tenant.hasHero
      ? heroImageUrl(site.tenant.slug)
      : "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=1920&q=80",
    sobreNosotros:
      aboutParrafos.length > 0
        ? {
            texto: aboutParrafos,
            imagenUrl: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80",
          }
        : undefined,
    eventos,
    cursos,
    galeria,
    contacto: hasContactInfo
      ? {
          email: cfgContacto?.email || "",
          telefono: cfgContacto?.telefono,
          direccion: cfgContacto?.direccion,
          ciudad: meta.ciudad || "",
          redesSociales: {
            ...(cfgContacto?.facebook ? { facebook: cfgContacto.facebook } : {}),
            ...(cfgContacto?.instagram ? { instagram: cfgContacto.instagram } : {}),
          },
        }
      : undefined,
    bloques: {
      sobreNosotros: aboutParrafos.length > 0,
      eventos: eventos.length > 0,
      cursos: cursos.length > 0,
      galeria: !!site.config.gallery?.enabled && galeria.length > 0,
      contacto: hasContactInfo,
    },
  };
}
