const BACKEND_URL = process.env.BACKEND_URL || "http://backend:4000";
export const PUBLIC_API_URL = process.env.PUBLIC_API_URL || "http://localhost:4000/api";

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
  };
};

export async function fetchSite(slug: string): Promise<SiteData | null> {
  const res = await fetch(`${BACKEND_URL}/api/public/sites/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return res.json();
}

export function heroImageUrl(slug: string): string {
  return `${PUBLIC_API_URL}/public/sites/${encodeURIComponent(slug)}/hero-image`;
}

// Theme name → hex (for CSS --color-tema). Matches admin palette.
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

// Mock data used until backend exposes each section.
// TODO: replace with real data from Gruppia backend iteration by iteration.
const MOCK_EVENTOS: SiteConfig["eventos"] = [
  {
    id: "e1",
    titulo: "Taller de iniciación a la pintura",
    fecha: "2026-05-12T18:00:00.000Z",
    hora: "18:00",
    lugar: "Centro Cívico",
    descripcion: "Taller práctico para todas las edades.",
    categoria: "Taller",
    imagenUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80",
  },
  {
    id: "e2",
    titulo: "Charla: Historia de nuestro barrio",
    fecha: "2026-05-20T19:30:00.000Z",
    hora: "19:30",
    lugar: "Biblioteca Municipal",
    descripcion: "Un recorrido por la historia y anécdotas del barrio.",
    categoria: "Charla",
    imagenUrl: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=80",
  },
  {
    id: "e3",
    titulo: "Cuentacuentos en familia",
    fecha: "2026-05-28T17:00:00.000Z",
    hora: "17:00",
    lugar: "Casa de cultura",
    descripcion: "Historias, juegos y mucha diversión para los más pequeños.",
    categoria: "Infantil",
    imagenUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
  },
  {
    id: "e4",
    titulo: "Concierto de primavera",
    fecha: "2026-06-05T20:00:00.000Z",
    hora: "20:00",
    lugar: "Plaza Mayor",
    descripcion: "Concierto al aire libre con grupos locales.",
    categoria: "Música",
    imagenUrl: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80",
  },
];

const MOCK_CURSOS: SiteConfig["cursos"] = [
  {
    id: "c1",
    titulo: "Curso de fotografía nivel iniciación",
    horario: "Mayo – Junio 2026",
    plazas: 15,
    precio: 30,
    imagenUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80",
    inscripcionUrl: "#",
  },
  {
    id: "c2",
    titulo: "Yoga para principiantes",
    horario: "Lunes y miércoles",
    plazas: 10,
    precio: null,
    imagenUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
    inscripcionUrl: "#",
  },
  {
    id: "c3",
    titulo: "Taller de cerámica creativa",
    horario: "Junio – Julio 2026",
    plazas: 8,
    precio: 45,
    imagenUrl: "https://images.unsplash.com/photo-1565193298357-c5b46b3fc58d?w=800&q=80",
    inscripcionUrl: "#",
  },
  {
    id: "c4",
    titulo: "Escritura creativa",
    horario: "Martes 18:00–20:00",
    plazas: 12,
    precio: 25,
    imagenUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80",
    inscripcionUrl: "#",
  },
];

const MOCK_GALERIA: SiteConfig["galeria"] = [
  { id: "g1", imagenUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80", alt: "Actividad cultural" },
  { id: "g2", imagenUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&q=80", alt: "Evento" },
  { id: "g3", imagenUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80", alt: "Taller" },
  { id: "g4", imagenUrl: "https://images.unsplash.com/photo-1515169067868-5387ec356754?w=600&q=80", alt: "Concierto" },
  { id: "g5", imagenUrl: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&q=80", alt: "Reunión" },
];

/**
 * Merge real backend data with mocks for sections not yet wired.
 * Will shrink as more blocks are connected to the backend.
 */
export function composeSiteConfig(site: SiteData): SiteConfig {
  const colorTema = themeHex(site.tenant.theme);
  const nombre = site.config.hero?.title || site.tenant.name;
  const subtitulo = site.config.hero?.subtitle || "Un espacio de encuentro y actividad";
  const aboutParrafos = site.config.about?.text
    ? site.config.about.text.split(/\n\s*\n/).filter(Boolean)
    : [
        "Somos una asociación vecinal sin ánimo de lucro que promueve actividades culturales, educativas y sociales abiertas a todas las edades.",
        "Trabajamos para fomentar la convivencia, la creatividad y el sentido de comunidad en nuestro barrio.",
      ];

  return {
    nombre,
    subtitulo,
    categoria: "Asociación cultural",
    ciudad: "Pamplona",
    socios: 120,
    anos: 20,
    colorTema,
    heroImageUrl: site.tenant.hasHero
      ? heroImageUrl(site.tenant.slug)
      : "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=1920&q=80",
    sobreNosotros: {
      texto: aboutParrafos,
      imagenUrl: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80",
    },
    eventos: MOCK_EVENTOS,
    cursos: MOCK_CURSOS,
    galeria: MOCK_GALERIA,
    contacto: {
      email: `info@${site.tenant.slug}.org`,
      telefono: "600 123 456",
      direccion: "Calle Mayor 12, 31001 Pamplona, Navarra",
      ciudad: "Pamplona",
      redesSociales: {
        facebook: "#",
        instagram: "#",
      },
    },
    bloques: {
      sobreNosotros: true,
      eventos: true,
      cursos: true,
      galeria: true,
      contacto: true,
    },
  };
}
