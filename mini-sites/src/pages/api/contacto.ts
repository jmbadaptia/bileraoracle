import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:4000";
const PARENT_DOMAIN = (process.env.MINI_SITE_DOMAIN || "").toLowerCase();

function slugFromHost(host: string | null): string | null {
  if (!host || !PARENT_DOMAIN) return null;
  const hostname = host.split(":")[0].toLowerCase();
  if (!hostname.endsWith(`.${PARENT_DOMAIN}`)) return null;
  const subdomain = hostname.slice(0, -1 - PARENT_DOMAIN.length);
  if (!subdomain || subdomain.includes(".")) return null;
  return subdomain;
}

export const POST: APIRoute = async ({ request }) => {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { nombre, email, asunto, mensaje, slug: bodySlug } = payload || {};
  if (!nombre || !email || !asunto || !mensaje) {
    return new Response(JSON.stringify({ error: "Faltan campos" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const slug = bodySlug || slugFromHost(request.headers.get("host"));
  if (!slug) {
    return new Response(JSON.stringify({ error: "No se pudo determinar la asociación" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch(`${BACKEND_URL}/api/public/sites/${encodeURIComponent(slug)}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, asunto, mensaje }),
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
};
