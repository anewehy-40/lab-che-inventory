import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes, ensureAdminExists } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { exportRouter } from "../exportRouter";
import { researchIntelligenceRouter } from "../researchIntelligence";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Health check — registered first so it always responds 200,
  // independent of database or downstream service availability.
  app.get("/health", (_req, res) => {
    res.status(200).send("ok");
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerAuthRoutes(app);
  app.use("/api/export", exportRouter);
  app.use("/api/research-intelligence", researchIntelligenceRouter);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000", 10);

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
    // Seed the admin account after the server is already accepting
    // connections, so a slow/unavailable database can't block startup.
    ensureAdminExists().catch(error =>
      console.error("[Auth] Admin seeding failed:", error)
    );
  });
}

startServer().catch(console.error);
