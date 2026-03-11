import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { initPool, closePool } from "./lib/db.js";
import { authRoutes } from "./routes/auth.js";

const app = Fastify({ logger: true });

async function start() {
  // Plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "bilera-dev-secret-change-in-prod",
  });

  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  });

  // Init Oracle connection pool
  await initPool();

  // Routes
  await app.register(authRoutes);

  // Health check
  app.get("/api/health", async () => ({ status: "ok" }));

  // Start
  const port = parseInt(process.env.PORT || "4000");
  await app.listen({ port, host: "0.0.0.0" });

  // Graceful shutdown
  const shutdown = async () => {
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
