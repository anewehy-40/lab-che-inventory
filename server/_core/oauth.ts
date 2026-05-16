import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { hashPassword, verifyPassword, sdk } from "./sdk";
import { ENV } from "./env";
import { nanoid } from "nanoid";

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    try {
      const user = await db.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

      const token = await sdk.createSessionToken(user.openId, {
        name: user.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ ok: true, user: { name: user.name, email: user.email, role: user.role } });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
}

export async function ensureAdminExists() {
  const { adminEmail, adminPassword } = ENV;
  if (!adminEmail || !adminPassword) return;

  try {
    const existing = await db.getUserByEmail(adminEmail);
    if (existing) return;

    const passwordHash = await hashPassword(adminPassword);
    await db.createUser({
      openId: nanoid(),
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "admin",
    });
    console.log("[Auth] Admin account created for", adminEmail);
  } catch (error) {
    console.warn("[Auth] Could not create admin account:", error);
  }
}
