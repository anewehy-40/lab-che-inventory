import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getAllChemicals: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Sodium chloride",
      formula: "NaCl",
      molecularWeight: "58.44",
      category: "Inorganic salt",
      hazardLevel: "Normal",
      ghsCodes: "None",
      storageConditions: "RT, dry",
      physicalState: "Powder/Solid",
      notes: "",
      quantity: null,
      unit: null,
      supplier: null,
      lotNumber: null,
      expiryDate: null,
      location: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getChemicalById: vi.fn().mockImplementation(async (id: number) => {
    if (id === 99) return {
      id: 99,
      name: "Test Chemical",
      formula: "TC",
      molecularWeight: "100.00",
      category: "Test",
      hazardLevel: "Normal" as const,
      ghsCodes: "None",
      storageConditions: "RT",
      physicalState: "Powder/Solid" as const,
      notes: "",
      quantity: null,
      unit: null,
      supplier: null,
      lotNumber: null,
      expiryDate: null,
      location: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (id === 1) return {
      id: 1,
      name: "Sodium chloride",
      formula: "NaCl",
      molecularWeight: "58.44",
      category: "Inorganic salt",
      hazardLevel: "Normal",
      ghsCodes: "None",
      storageConditions: "RT, dry",
      physicalState: "Powder/Solid",
      notes: "",
      quantity: null,
      unit: null,
      supplier: null,
      lotNumber: null,
      expiryDate: null,
      location: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return undefined;
  }),
  insertChemical: vi.fn().mockResolvedValue(99),
  updateChemical: vi.fn().mockResolvedValue(undefined),
  deleteChemical: vi.fn().mockResolvedValue(undefined),
  deleteChemicalByName: vi.fn().mockImplementation(async (name: string) => {
    if (name.toLowerCase().includes("sodium")) return { deleted: [{ id: 1, name: "Sodium chloride" }] };
    return { deleted: [] };
  }),
  findChemicalsByName: vi.fn().mockResolvedValue([]),
  getChemicalsCount: vi.fn().mockResolvedValue(43),
}));

function createCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      email: "mada.mado29@gmail.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("chemicals.list", () => {
  it("returns list of chemicals", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.chemicals.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].name).toBe("Sodium chloride");
  });
});

describe("chemicals.count", () => {
  it("returns the total count", async () => {
    const caller = appRouter.createCaller(createCtx());
    const count = await caller.chemicals.count();
    expect(count).toBe(43);
  });
});

describe("chemicals.getById", () => {
  it("returns a chemical by id", async () => {
    const caller = appRouter.createCaller(createCtx());
    const chem = await caller.chemicals.getById({ id: 1 });
    expect(chem).toBeDefined();
    expect(chem?.name).toBe("Sodium chloride");
  });

  it("returns undefined for unknown id", async () => {
    const caller = appRouter.createCaller(createCtx());
    const chem = await caller.chemicals.getById({ id: 9999 });
    expect(chem).toBeUndefined();
  });
});

describe("chemicals.add", () => {
  it("inserts a new chemical and returns it", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.chemicals.add({
      name: "Test Chemical",
      formula: "TC",
      molecularWeight: "100.00",
      category: "Test",
      hazardLevel: "Normal",
      ghsCodes: "None",
      storageConditions: "RT",
      physicalState: "Powder/Solid",
      notes: "",
    });
    expect(result).toBeDefined();
  });
});

describe("chemicals.update", () => {
  it("updates a chemical's editable fields", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.chemicals.update({
      id: 1,
      data: { quantity: "500", unit: "g", location: "Shelf A" },
    });
    expect(result).toBeDefined();
  });
});

describe("chemicals.delete", () => {
  it("deletes a chemical and returns success", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.chemicals.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
