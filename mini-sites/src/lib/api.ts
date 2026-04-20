const BACKEND_URL = process.env.BACKEND_URL || "http://backend:4000";

export type SiteData = {
  tenant: {
    id: number;
    name: string;
    slug: string;
    theme: string;
    hasLogo: boolean;
  };
  config: {
    hero?: { title?: string; subtitle?: string; imageUrl?: string };
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
