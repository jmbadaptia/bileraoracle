import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { initPool, closePool } from "./lib/db.js";
import { authRoutes } from "./routes/auth.js";
import { tagRoutes } from "./routes/tags.js";
import { groupRoutes } from "./routes/groups.js";
import { memberRoutes } from "./routes/members.js";
import { activityRoutes } from "./routes/activities.js";
import { documentRoutes } from "./routes/documents.js";
import { albumRoutes } from "./routes/albums.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { searchRoutes } from "./routes/search.js";
import { aiRoutes } from "./routes/ai.js";
import { contactRoutes } from "./routes/contacts.js";
import { conversationRoutes } from "./routes/conversations.js";
import { chatRoutes } from "./routes/chat.js";

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
  await app.register(tagRoutes);
  await app.register(groupRoutes);
  await app.register(memberRoutes);
  await app.register(activityRoutes);
  await app.register(documentRoutes);
  await app.register(albumRoutes);
  await app.register(dashboardRoutes);
  await app.register(searchRoutes);
  await app.register(aiRoutes);
  await app.register(contactRoutes);
  await app.register(conversationRoutes);
  await app.register(chatRoutes);

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
