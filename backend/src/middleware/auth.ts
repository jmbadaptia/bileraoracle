import { FastifyRequest, FastifyReply } from "fastify";

// Extend Fastify request with user info
declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      name: string;
      tenantId: number;
      role: string;
    };
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const decoded = await request.jwtVerify<{
      id: string;
      email: string;
      name: string;
      tenantId: number;
      role: string;
    }>();
    request.user = decoded;
  } catch {
    return reply.code(401).send({ error: "No autorizado" });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  await requireAuth(request, reply);
  if (request.user && request.user.role !== "ADMIN") {
    return reply.code(403).send({ error: "Se requiere rol de administrador" });
  }
}
