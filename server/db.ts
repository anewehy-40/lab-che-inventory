import { eq, like, or, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, chemicals, InsertChemical, Chemical, savedProtocols, InsertSavedProtocol, SavedProtocol } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(data: { openId: string; email: string; name: string; passwordHash: string; role: 'user' | 'admin' }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({ ...data, loginMethod: 'email', lastSignedIn: new Date() });
}

// ── Chemical helpers ──────────────────────────────────────────────────────────

export async function getAllChemicals(): Promise<Chemical[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chemicals).orderBy(chemicals.id);
}

export async function getChemicalById(id: number): Promise<Chemical | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(chemicals).where(eq(chemicals.id, id)).limit(1);
  return result[0];
}

export async function insertChemical(data: InsertChemical): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(chemicals).values(data);
  return (result[0] as any).insertId as number;
}

export async function updateChemical(id: number, data: Partial<InsertChemical>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(chemicals).set(data).where(eq(chemicals.id, id));
}

export async function deleteChemical(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(chemicals).where(eq(chemicals.id, id));
}

export async function findChemicalsByName(name: string): Promise<Chemical[]> {
  const db = await getDb();
  if (!db) return [];
  // Case-insensitive partial match
  return db.select().from(chemicals).where(like(chemicals.name, `%${name}%`));
}

export async function deleteChemicalByName(name: string): Promise<{ deleted: Chemical[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Find exact match first, then partial
  const exactMatches = await db.select().from(chemicals).where(eq(chemicals.name, name));
  const targets = exactMatches.length > 0
    ? exactMatches
    : await db.select().from(chemicals).where(like(chemicals.name, `%${name}%`));
  for (const chem of targets) {
    await db.delete(chemicals).where(eq(chemicals.id, chem.id));
  }
  return { deleted: targets };
}

export async function getChemicalsCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(chemicals);
  return result.length;
}

// ── Saved Protocols helpers ───────────────────────────────────────────────────

export async function getAllSavedProtocols(): Promise<SavedProtocol[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedProtocols).orderBy(savedProtocols.createdAt);
}

export async function insertSavedProtocol(data: InsertSavedProtocol): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(savedProtocols).values(data);
  return (result[0] as any).insertId as number;
}

export async function deleteSavedProtocol(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(savedProtocols).where(eq(savedProtocols.id, id));
}
