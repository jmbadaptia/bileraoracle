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

type ThemeColor = { primary: string; gradientFrom: string; gradientTo: string };
const THEMES: Record<string, ThemeColor> = {
  default: { primary: "oklch(0.55 0.19 25)",  gradientFrom: "oklch(0.97 0.03 25)",  gradientTo: "oklch(0.99 0.01 25)" },
  blue:    { primary: "oklch(0.55 0.17 250)", gradientFrom: "oklch(0.97 0.03 250)", gradientTo: "oklch(0.99 0.01 250)" },
  green:   { primary: "oklch(0.55 0.16 150)", gradientFrom: "oklch(0.97 0.03 150)", gradientTo: "oklch(0.99 0.01 150)" },
  violet:  { primary: "oklch(0.55 0.17 290)", gradientFrom: "oklch(0.97 0.03 290)", gradientTo: "oklch(0.99 0.01 290)" },
  rose:    { primary: "oklch(0.57 0.18 350)", gradientFrom: "oklch(0.97 0.03 350)", gradientTo: "oklch(0.99 0.01 350)" },
  teal:    { primary: "oklch(0.57 0.12 180)", gradientFrom: "oklch(0.97 0.03 180)", gradientTo: "oklch(0.99 0.01 180)" },
};

export function themeColors(theme: string): ThemeColor {
  return THEMES[theme] || THEMES.default;
}
