import type { APIRoute } from "astro";

// Minimal contact endpoint: logs the message and returns 200.
// TODO: wire to Gruppia backend to forward to tenant admin email.
export const POST: APIRoute = async ({ request }) => {
  let payload: any = null;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { nombre, email, asunto, mensaje } = payload || {};
  if (!nombre || !email || !asunto || !mensaje) {
    return new Response(JSON.stringify({ error: "Faltan campos" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[contacto]", { host: request.headers.get("host"), nombre, email, asunto });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
