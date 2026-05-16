import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the LLM module so tests don't make real API calls
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("scanLabel.analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns extracted chemical data when AI responds successfully", async () => {
    const mockLabelData = {
      name: "Hydrochloric Acid",
      concentration_percent: 37,
      concentration_molarity: 12.1,
      density: 1.19,
      molecular_weight: 36.46,
      cas_number: "7647-01-0",
      purity: 37,
      notes: "Fuming, corrosive",
    };

    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(mockLabelData),
          },
        },
      ],
    });

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scanLabel.analyze({
      imageBase64: "dGVzdA==", // base64 for "test"
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      name: "Hydrochloric Acid",
      concentration_percent: 37,
      concentration_molarity: 12.1,
      density: 1.19,
      molecular_weight: 36.46,
      cas_number: "7647-01-0",
    });
  });

  it("returns success=false when AI throws an error", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("AI service unavailable")
    );

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scanLabel.analyze({
      imageBase64: "dGVzdA==",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
  });

  it("returns success=false when AI returns invalid JSON", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "This is not JSON",
          },
        },
      ],
    });

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scanLabel.analyze({
      imageBase64: "dGVzdA==",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
  });

  it("handles null fields gracefully (partial label data)", async () => {
    const partialData = {
      name: "Ethanol",
      concentration_percent: null,
      concentration_molarity: null,
      density: 0.789,
      molecular_weight: 46.07,
      cas_number: null,
      purity: 99.8,
      notes: null,
    };

    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify(partialData),
          },
        },
      ],
    });

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scanLabel.analyze({
      imageBase64: "dGVzdA==",
      mimeType: "image/png",
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Ethanol");
    expect(result.data?.concentration_percent).toBeNull();
    expect(result.data?.density).toBe(0.789);
  });
});
