import { int, longtext, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const chemicals = mysqlTable("chemicals", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  formula: varchar("formula", { length: 255 }),
  molecularWeight: varchar("molecularWeight", { length: 64 }),
  category: varchar("category", { length: 128 }),
  hazardLevel: mysqlEnum("hazardLevel", ["Normal", "Hazardous", "High Hazard"]).default("Normal").notNull(),
  ghsCodes: varchar("ghsCodes", { length: 255 }),
  storageConditions: varchar("storageConditions", { length: 255 }),
  physicalState: mysqlEnum("physicalState", ["Powder/Solid", "Liquid"]).default("Powder/Solid").notNull(),
  notes: text("notes"),
  scientificUses: text("scientificUses"),
  // User-fillable fields
  quantity: varchar("quantity", { length: 64 }),
  unit: varchar("unit", { length: 32 }),
  supplier: varchar("supplier", { length: 255 }),
  lotNumber: varchar("lotNumber", { length: 128 }),
  expiryDate: varchar("expiryDate", { length: 32 }),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Chemical = typeof chemicals.$inferSelect;
export type InsertChemical = typeof chemicals.$inferInsert;

export const savedProtocols = mysqlTable("saved_protocols", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  question: text("question").notNull(),
  response: longtext("response").notNull(),
  tags: varchar("tags", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedProtocol = typeof savedProtocols.$inferSelect;
export type InsertSavedProtocol = typeof savedProtocols.$inferInsert;

// Structured research protocols: steps, reagents and references stored as JSON.
export const protocols = mysqlTable("protocols", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 128 }),
  description: text("description"),
  steps: longtext("steps"),
  reagents: longtext("reagents"),
  citations: longtext("citations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Protocol = typeof protocols.$inferSelect;
export type InsertProtocol = typeof protocols.$inferInsert;

// Lab notebook: a record of each time a protocol was executed.
export const experimentLogs = mysqlTable("experiment_logs", {
  id: int("id").autoincrement().primaryKey(),
  protocolId: int("protocolId"),
  protocolTitle: varchar("protocolTitle", { length: 255 }).notNull(),
  performedBy: varchar("performedBy", { length: 255 }),
  sampleCount: int("sampleCount"),
  outcome: mysqlEnum("outcome", ["success", "partial", "failed"]).default("success").notNull(),
  notes: text("notes"),
  runAt: timestamp("runAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExperimentLog = typeof experimentLogs.$inferSelect;
export type InsertExperimentLog = typeof experimentLogs.$inferInsert;
