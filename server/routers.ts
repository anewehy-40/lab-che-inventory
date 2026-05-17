import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";

import {
  getAllChemicals,
  getChemicalById,
  insertChemical,
  updateChemical,
  deleteChemical,
  deleteChemicalByName,
  findChemicalsByName,
  getChemicalsCount,
  getAllSavedProtocols,
  insertSavedProtocol,
  deleteSavedProtocol,
} from "./db";

// Admin-only procedure: must be logged in AND have role="admin"
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const ChemicalUpdateSchema = z.object({
  name: z.string().optional(),
  formula: z.string().optional(),
  molecularWeight: z.string().optional(),
  category: z.string().optional(),
  hazardLevel: z.enum(["Normal", "Hazardous", "High Hazard"]).optional(),
  ghsCodes: z.string().optional(),
  storageConditions: z.string().optional(),
  physicalState: z.enum(["Powder/Solid", "Liquid"]).optional(),
  notes: z.string().optional(),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  supplier: z.string().optional(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
});

// ── Lab Assistant Router ────────────────────────────────────────────────────
const labAssistantRouter = router({
  chat: publicProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const chemicals = await getAllChemicals();
      const inventoryList = chemicals
        .map((c) => `- ${c.name} (${c.formula || "—"}, ${c.physicalState}, ${c.hazardLevel})`)
        .join("\n");

      const systemPrompt = `You are an expert scientific research assistant for a university laboratory. 
You have access to the lab's current chemical inventory listed below.

LAB INVENTORY (${chemicals.length} chemicals):
${inventoryList}

Your role:
1. Help researchers design and discuss experimental protocols
2. Suggest the most appropriate analytical methods for their research goals
3. Provide ACCURATE scientific references in proper citation format (Author, Year, Journal, DOI if known)
4. Cross-check required chemicals against the lab inventory — clearly indicate which chemicals are AVAILABLE (✅) or MISSING (❌) from the lab
5. Discuss experimental steps, troubleshooting, and best practices
6. Suggest alternative methods when lab chemicals are missing
7. Always cite peer-reviewed references (not textbooks alone) — prefer highly cited methods papers

Format your responses clearly with sections:
- **Recommended Method**: name and brief description
- **Required Chemicals**: list with ✅/❌ availability from inventory
- **Protocol Steps**: numbered steps
- **Key Reference**: proper citation (Author et al., Year. Title. Journal. DOI)
- **Discussion**: any important notes, variations, or troubleshooting tips

Respond in the same language the user writes in (Arabic or English).`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          ...input.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
      });

      const content = response.choices[0]?.message?.content;
      const text = typeof content === "string" ? content : JSON.stringify(content);
      return { reply: text };
    }),

  pubchem: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        // Step 1: get CID from name
        const cidRes = await fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(input.name)}/cids/JSON`
        );
        if (!cidRes.ok) return { found: false, name: input.name };
        const cidData = await cidRes.json() as any;
        const cid = cidData?.IdentifierList?.CID?.[0];
        if (!cid) return { found: false, name: input.name };

        // Step 2: get properties
        const propRes = await fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,MeltingPoint,BoilingPoint,Solubility/JSON`
        );
        const propData = await propRes.json() as any;
        const props = propData?.PropertyTable?.Properties?.[0] || {};

        // Step 3: get CAS from synonyms
        let casNumber: string | null = null;
        try {
          const synRes = await fetch(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`
          );
          const synData = await synRes.json() as any;
          const synonyms: string[] = synData?.InformationList?.Information?.[0]?.Synonym || [];
          const casMatch = synonyms.find((s: string) => /^\d{2,7}-\d{2}-\d$/.test(s));
          casNumber = casMatch || null;
        } catch { /* ignore */ }

        return {
          found: true,
          cid,
          name: input.name,
          formula: props.MolecularFormula || null,
          molecularWeight: props.MolecularWeight ? String(props.MolecularWeight) : null,
          iupacName: props.IUPACName || null,
          meltingPoint: props.MeltingPoint ? `${props.MeltingPoint} °C` : null,
          boilingPoint: props.BoilingPoint ? `${props.BoilingPoint} °C` : null,
          solubility: props.Solubility || null,
          casNumber,
        };
      } catch {
        return { found: false, name: input.name };
      }
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  chemicals: router({
    list: publicProcedure.query(async () => {
      return getAllChemicals();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getChemicalById(input.id);
      }),

    add: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          formula: z.string().optional(),
          molecularWeight: z.string().optional(),
          category: z.string().optional(),
          hazardLevel: z.enum(["Normal", "Hazardous", "High Hazard"]).default("Normal"),
          ghsCodes: z.string().optional(),
          storageConditions: z.string().optional(),
          physicalState: z.enum(["Powder/Solid", "Liquid"]).default("Powder/Solid"),
          notes: z.string().optional(),
          quantity: z.string().optional(),
          unit: z.string().optional(),
          supplier: z.string().optional(),
          lotNumber: z.string().optional(),
          expiryDate: z.string().optional(),
          location: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const id = await insertChemical(input);
        return getChemicalById(id);
      }),

    update: adminProcedure
      .input(z.object({ id: z.number(), data: ChemicalUpdateSchema }))
      .mutation(async ({ input }) => {
        await updateChemical(input.id, input.data);
        return getChemicalById(input.id);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteChemical(input.id);
        return { success: true };
      }),

    count: publicProcedure.query(async () => {
      return getChemicalsCount();
    }),

    bulkImport: adminProcedure
      .input(
        z.object({
          chemicals: z
            .array(
              z.object({
                name: z.string().min(1),
                formula: z.string().optional(),
                molecularWeight: z.string().optional(),
                category: z.string().optional(),
                hazardLevel: z
                  .enum(["Normal", "Hazardous", "High Hazard"])
                  .default("Normal"),
                ghsCodes: z.string().optional(),
                storageConditions: z.string().optional(),
                physicalState: z
                  .enum(["Powder/Solid", "Liquid"])
                  .default("Powder/Solid"),
                notes: z.string().optional(),
                quantity: z.string().optional(),
                unit: z.string().optional(),
                supplier: z.string().optional(),
                lotNumber: z.string().optional(),
                expiryDate: z.string().optional(),
                location: z.string().optional(),
              })
            )
            .min(1)
            .max(2000),
        })
      )
      .mutation(async ({ input }) => {
        let inserted = 0;
        for (const chemical of input.chemicals) {
          await insertChemical(chemical);
          inserted++;
        }
        return { inserted };
      }),

    aiChat: adminProcedure
      .input(z.object({ message: z.string() }))
      .mutation(async ({ input }) => {
        const intentResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a lab chemical inventory assistant. Classify the user's message intent.
Return JSON: { "intent": "add" | "delete" | "unknown", "chemicals": ["name1", "name2"] }
- "add": user wants to add one or more chemicals
- "delete": user wants to remove/delete one or more chemicals
- "unknown": unclear request
Extract chemical names mentioned. Return ONLY JSON, no extra text.`,
            },
            { role: "user", content: input.message },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "intent_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  intent: { type: "string", enum: ["add", "delete", "unknown"] },
                  chemicals: { type: "array", items: { type: "string" } },
                },
                required: ["intent", "chemicals"],
                additionalProperties: false,
              },
            },
          } as any,
        });

        const intentRaw = intentResponse.choices[0]?.message?.content;
        const intentStr = typeof intentRaw === "string" ? intentRaw : JSON.stringify(intentRaw);
        let intentData: { intent: string; chemicals: string[] } = { intent: "unknown", chemicals: [] };
        try { intentData = JSON.parse(intentStr); } catch {}

        if (intentData.intent === "delete") {
          const deleted: string[] = [];
          const notFound: string[] = [];
          for (const chemName of intentData.chemicals) {
            const result = await deleteChemicalByName(chemName);
            if (result.deleted.length > 0) {
              deleted.push(...result.deleted.map(c => c.name));
            } else {
              notFound.push(chemName);
            }
          }
          let message = "";
          if (deleted.length > 0) message += `Successfully deleted: ${deleted.join(", ")}. `;
          if (notFound.length > 0) message += `Could not find: ${notFound.join(", ")}. `;
          if (!message) message = "No chemicals were deleted.";
          return { intent: "delete" as const, success: deleted.length > 0, chemicals: [], deleted, notFound, message };
        }

        if (intentData.intent === "add") {
          const addResponse = await invokeLLM({
            messages: [
              { role: "system", content: `You are a laboratory chemical information assistant. Return structured JSON data for chemicals. For hazard level: "Normal", "Hazardous", or "High Hazard". For GHS codes: standard codes like GHS01-GHS09 comma separated. For physical state: "Powder/Solid" or "Liquid".` },
              { role: "user", content: `The user wants to add: "${input.message}". Return a JSON object with a "chemicals" array.` },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "chemicals_list",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    chemicals: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          formula: { type: "string" },
                          molecularWeight: { type: "string" },
                          category: { type: "string" },
                          hazardLevel: { type: "string", enum: ["Normal", "Hazardous", "High Hazard"] },
                          ghsCodes: { type: "string" },
                          storageConditions: { type: "string" },
                          physicalState: { type: "string", enum: ["Powder/Solid", "Liquid"] },
                          notes: { type: "string" },
                          scientificUses: { type: "string" },
                        },
                        required: ["name", "formula", "molecularWeight", "category", "hazardLevel", "ghsCodes", "storageConditions", "physicalState", "notes", "scientificUses"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["chemicals"],
                  additionalProperties: false,
                },
              },
            } as any,
          });

          const addRaw = addResponse.choices[0]?.message?.content;
          const addStr = typeof addRaw === "string" ? addRaw : JSON.stringify(addRaw);
          const parsed = JSON.parse(addStr);
          const chemList = parsed.chemicals || parsed;

          const inserted = [];
          for (const chem of chemList) {
            const id = await insertChemical({
              name: chem.name,
              formula: chem.formula || "—",
              molecularWeight: chem.molecularWeight || "—",
              category: chem.category || "Unknown",
              hazardLevel: chem.hazardLevel as any,
              ghsCodes: chem.ghsCodes || "None",
              storageConditions: chem.storageConditions || "RT",
              physicalState: chem.physicalState as any,
              notes: chem.notes || "",
              scientificUses: chem.scientificUses || "",
            });
            const saved = await getChemicalById(id);
            if (saved) inserted.push(saved);
          }
          return {
            intent: "add" as const,
            success: true,
            chemicals: inserted,
            deleted: [],
            notFound: [],
            message: `Successfully added ${inserted.length} chemical${inserted.length > 1 ? "s" : ""}: ${inserted.map(c => c.name).join(", ")}`,
          };
        }

        return {
          intent: "unknown" as const,
          success: false,
          chemicals: [],
          deleted: [],
          notFound: [],
          message: "I did not understand your request. Try: \"add ethanol\" or \"delete sucrose\".",
        };
      }),

    aiLookup: adminProcedure
      .input(z.object({ message: z.string() }))
      .mutation(async ({ input }) => {
        const systemPrompt = `You are a laboratory chemical information assistant. When given a chemical name or description, extract or identify the chemical and return structured JSON data. Always respond with valid JSON only, no markdown, no extra text. For hazard level: use "Normal" for non-hazardous chemicals, "Hazardous" for moderately hazardous, "High Hazard" for highly toxic/corrosive/flammable chemicals. For GHS codes: use standard GHS pictogram codes like GHS01-GHS09 (comma separated). For physical state: use "Powder/Solid" or "Liquid". For molecular weight: use a number string like "58.44" or "—" if unknown/mixture.`;

        const userPrompt = `The user said: "${input.message}"

Please identify the chemical(s) mentioned and return a JSON array of chemicals to add. Each chemical object must have these fields:
- name (string): full IUPAC or common name
- formula (string): chemical formula, or "—" if unknown
- molecularWeight (string): molecular weight in g/mol as a number string, or "—" if unknown/mixture
- category (string): e.g. "Strong acid", "Solvent", "Inorganic salt", "Buffer component", etc.
- hazardLevel (string): exactly one of "Normal", "Hazardous", "High Hazard"
- ghsCodes (string): comma-separated GHS codes like "GHS05, GHS07" or "None"
- storageConditions (string): e.g. "RT, dry", "Acid cabinet", "Flammable cabinet", "4°C fridge"
- physicalState (string): exactly "Powder/Solid" or "Liquid"
- notes (string): key safety or handling notes, or empty string

Return ONLY a JSON array, example: [{"name":"...","formula":"...","molecularWeight":"...","category":"...","hazardLevel":"Normal","ghsCodes":"None","storageConditions":"RT, dry","physicalState":"Powder/Solid","notes":""}]`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "chemicals_list",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    chemicals: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          formula: { type: "string" },
                          molecularWeight: { type: "string" },
                          category: { type: "string" },
                          hazardLevel: { type: "string", enum: ["Normal", "Hazardous", "High Hazard"] },
                          ghsCodes: { type: "string" },
                          storageConditions: { type: "string" },
                          physicalState: { type: "string", enum: ["Powder/Solid", "Liquid"] },
                          notes: { type: "string" },
                        },
                        required: ["name", "formula", "molecularWeight", "category", "hazardLevel", "ghsCodes", "storageConditions", "physicalState", "notes"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["chemicals"],
                  additionalProperties: false,
                },
              },
            } as any,
          });

          const rawContent = response.choices[0]?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
          if (!content) throw new Error("No response from AI");

          const parsed = JSON.parse(content);
          const chemList = parsed.chemicals || parsed;

          // Insert all chemicals into DB
          const inserted = [];
          for (const chem of chemList) {
            const id = await insertChemical({
              name: chem.name,
              formula: chem.formula || "—",
              molecularWeight: chem.molecularWeight || "—",
              category: chem.category || "Unknown",
              hazardLevel: chem.hazardLevel as any,
              ghsCodes: chem.ghsCodes || "None",
              storageConditions: chem.storageConditions || "RT",
              physicalState: chem.physicalState as any,
              notes: chem.notes || "",
              scientificUses: chem.scientificUses || "",
            });
            const saved = await getChemicalById(id);
            if (saved) inserted.push(saved);
          }

          return {
            success: true,
            chemicals: inserted,
            message: `Successfully added ${inserted.length} chemical${inserted.length > 1 ? "s" : ""}: ${inserted.map(c => c.name).join(", ")}`,
          };
        } catch (err: any) {
          console.error("[AI Lookup] Error:", err);
          return {
            success: false,
            chemicals: [],
            message: `Sorry, I could not process that request. Please try again or add the chemical manually.`,
          };
        }
      }),
  }),

  labAssistant: labAssistantRouter,

  protocols: router({
    list: publicProcedure.query(async () => {
      return getAllSavedProtocols();
    }),
    save: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        question: z.string().min(1),
        response: z.string().min(1),
        tags: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await insertSavedProtocol(input);
        const protocols = await getAllSavedProtocols();
        return protocols.find(p => p.id === id);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSavedProtocol(input.id);
        return { success: true };
      }),
  }),

  identifyChemical: router({
    fromPhoto: adminProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a laboratory chemical identification expert. Examine the photo of a chemical package, bottle, or label and identify the chemical.
Return complete structured data needed to add it to a lab inventory.
For hazard level: "Normal", "Hazardous", or "High Hazard".
For GHS codes: standard codes GHS01-GHS09 comma separated, or "None".
For physical state: "Powder/Solid" or "Liquid".
Always return valid JSON only, no markdown.`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${input.mimeType};base64,${input.imageBase64}`,
                      detail: "high",
                    },
                  },
                  {
                    type: "text",
                    text: "Identify the chemical in this image and return its full inventory data as JSON.",
                  },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "identified_chemical",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    formula: { type: "string" },
                    molecularWeight: { type: "string" },
                    category: { type: "string" },
                    hazardLevel: { type: "string", enum: ["Normal", "Hazardous", "High Hazard"] },
                    ghsCodes: { type: "string" },
                    storageConditions: { type: "string" },
                    physicalState: { type: "string", enum: ["Powder/Solid", "Liquid"] },
                    notes: { type: "string" },
                    scientificUses: { type: "string" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] },
                    identificationNotes: { type: "string" },
                  },
                  required: ["name", "formula", "molecularWeight", "category", "hazardLevel", "ghsCodes", "storageConditions", "physicalState", "notes", "scientificUses", "confidence", "identificationNotes"],
                  additionalProperties: false,
                },
              },
            } as any,
          });

          const content = response.choices[0]?.message?.content as string;
          const data = JSON.parse(content);
          return { success: true, data };
        } catch (err: any) {
          console.error("[IdentifyChemical] Error:", err);
          return {
            success: false,
            data: null,
            message: "Could not identify the chemical. Please ensure the image is clear.",
          };
        }
      }),
  }),

  scanLabel: router({
    analyze: publicProcedure
      .input(z.object({
        imageBase64: z.string(), // base64 encoded image
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a laboratory chemical label reader. Extract information from chemical bottle labels.
Always respond with valid JSON only, no markdown, no explanation.
Extract: chemical name, concentration (as percentage or molarity), density (g/mL), molecular weight (g/mol), CAS number if visible.
If a field is not visible or not applicable, use null.
Respond ONLY with this JSON structure:
{
  "name": "string or null",
  "concentration_percent": "number or null (% w/w or v/v)",
  "concentration_molarity": "number or null (M)",
  "density": "number or null (g/mL)",
  "molecular_weight": "number or null (g/mol)",
  "cas_number": "string or null",
  "purity": "number or null (%)",
  "notes": "string or null (any other relevant info)"
}`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${input.mimeType};base64,${input.imageBase64}`,
                      detail: "high",
                    },
                  },
                  {
                    type: "text",
                    text: "Read this chemical label and extract all relevant data. Return JSON only.",
                  },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "chemical_label",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    name: { type: ["string", "null"] },
                    concentration_percent: { type: ["number", "null"] },
                    concentration_molarity: { type: ["number", "null"] },
                    density: { type: ["number", "null"] },
                    molecular_weight: { type: ["number", "null"] },
                    cas_number: { type: ["string", "null"] },
                    purity: { type: ["number", "null"] },
                    notes: { type: ["string", "null"] },
                  },
                  required: ["name", "concentration_percent", "concentration_molarity", "density", "molecular_weight", "cas_number", "purity", "notes"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content as string;
          const data = JSON.parse(content);
          return { success: true, data };
        } catch (err: any) {
          console.error("[ScanLabel] Error:", err);
          return {
            success: false,
            data: null,
            message: "Could not read the label. Please ensure the image is clear and well-lit.",
          };
        }
      }),
  }),

  // ── Research Tools Router ────────────────────────────────────────────────
  research: router({

    // 1. Protocol Generator
    generateProtocol: publicProcedure
      .input(z.object({
        goal: z.string().min(3),
        language: z.enum(["en", "ar"]).default("en"),
      }))
      .mutation(async ({ input }) => {
        const chemicals = await getAllChemicals();
        const inventoryList = chemicals.map(c => c.name).join(", ");

        const systemPrompt = input.language === "ar"
          ? `أنت مساعد بحثي متخصص في الكيمياء التحليلية. عندما يُعطيك الباحث هدف تجربة، قم بتوليد بروتوكول تجريبي كامل باللغة العربية.

المخزون المتاح في المختبر: ${inventoryList}

يجب أن يتضمن البروتوكول:
1. **الهدف** - وصف موجز للتجربة
2. **المواد والكواشف** - قائمة بكل مادة مطلوبة مع الكمية التقريبية، وبجانب كل مادة: ✅ إذا كانت موجودة في المخزون أو ❌ إذا كانت غير موجودة
3. **الأجهزة والمعدات** - قائمة بالأجهزة المطلوبة
4. **خطوات التنفيذ** - خطوات مرقمة وتفصيلية
5. **المعادلات الكيميائية** - إذا وجدت
6. **حسابات التحضير** - كيفية تحضير المحاليل الأساسية
7. **المراجع** - 2-3 مراجع علمية محكمة بصيغة APA
8. **ملاحظات السلامة** - تحذيرات مهمة

استخدم Markdown للتنسيق.`
          : `You are a research assistant specialized in analytical chemistry. Generate a complete experimental protocol.

Lab inventory available: ${inventoryList}

The protocol must include:
1. **Objective** - brief description
2. **Reagents & Materials** - list each reagent with approximate quantity, mark ✅ if available in inventory or ❌ if not
3. **Equipment** - instruments needed
4. **Procedure** - numbered detailed steps
5. **Chemical Equations** - if applicable
6. **Preparation Calculations** - how to prepare stock solutions
7. **References** - 2-3 peer-reviewed references in APA format
8. **Safety Notes** - important warnings

Use Markdown formatting.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.goal },
          ],
        });
        return { protocol: response.choices[0]?.message?.content as string };
      }),

    // 2. Method Comparison
    compareMethods: publicProcedure
      .input(z.object({
        query: z.string().min(3),
        language: z.enum(["en", "ar"]).default("en"),
      }))
      .mutation(async ({ input }) => {
        const systemPrompt = input.language === "ar"
          ? `أنت خبير في الكيمياء التحليلية. قارن بين الطرق التحليلية المذكورة في سؤال الباحث.

قدّم مقارنة شاملة باللغة العربية تتضمن:
- جدول مقارنة يشمل: الحساسية، النطاق الخطي، التداخلات، الوقت، التكلفة، سهولة التطبيق، نوع العينة المناسبة
- مزايا وعيوب كل طريقة
- **التوصية النهائية** بناءً على نوع العينة والهدف
- المراجع العلمية

استخدم Markdown وجداول واضحة.`
          : `You are an expert in analytical chemistry. Compare the analytical methods mentioned in the researcher's question.

Provide a comprehensive comparison including:
- Comparison table: sensitivity, linear range, interferences, time, cost, ease of use, suitable sample type
- Advantages and disadvantages of each method
- **Final recommendation** based on sample type and objective
- Scientific references

Use Markdown with clear tables.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.query },
          ],
        });
        return { comparison: response.choices[0]?.message?.content as string };
      }),

    // 3. Scientific Writing Assistant
    writeSection: publicProcedure
      .input(z.object({
        section: z.enum(["materials_methods", "results", "both"]),
        rawData: z.string().min(10),
        language: z.enum(["en", "ar"]).default("en"),
      }))
      .mutation(async ({ input }) => {
        const sectionLabel = {
          materials_methods: input.language === "ar" ? "المواد والطرق" : "Materials & Methods",
          results: input.language === "ar" ? "النتائج" : "Results",
          both: input.language === "ar" ? "المواد والطرق + النتائج" : "Materials & Methods + Results",
        }[input.section];

        const systemPrompt = input.language === "ar"
          ? `أنت مساعد كتابة علمية متخصص. اكتب قسم "${sectionLabel}" لورقة بحثية علمية باللغة الإنجليزية (لأن معظم المجلات العلمية تنشر بالإنجليزية) بناءً على البيانات الخام التي يقدمها الباحث.

المتطلبات:
- أسلوب أكاديمي رسمي مناسب للنشر في مجلة علمية محكمة
- استخدام الصيغة المبنية للمجهول (passive voice) في قسم المواد والطرق
- ذكر الأرقام والإحصاءات بدقة
- الإشارة إلى المراجع بصيغة (Author, Year) حيث ينطبق
- تنسيق واضح ومنظم

بعد النص الإنجليزي، أضف ترجمة عربية موجزة للنقاط الرئيسية.`
          : `You are a specialized scientific writing assistant. Write the "${sectionLabel}" section for a scientific paper based on the researcher's raw data.

Requirements:
- Formal academic style suitable for publication in a peer-reviewed journal
- Use passive voice in Materials & Methods
- Report numbers and statistics precisely
- Cite references as (Author, Year) where applicable
- Clear, organized formatting with proper paragraph structure
- Use appropriate scientific terminology`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Raw data and notes:\n${input.rawData}` },
          ],
        });
        return { text: response.choices[0]?.message?.content as string };
      }),

    // 4. PubMed Literature Search
    searchPubmed: publicProcedure
      .input(z.object({
        query: z.string().min(2),
        maxResults: z.number().min(1).max(20).default(10),
      }))
      .mutation(async ({ input }) => {
        try {
          // Search PubMed eSearch API
          const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(input.query)}&retmax=${input.maxResults}&retmode=json&sort=relevance`;
          const searchRes = await fetch(searchUrl);
          const searchData = await searchRes.json() as any;
          const ids: string[] = searchData?.esearchresult?.idlist || [];

          if (ids.length === 0) {
            return { articles: [], total: 0 };
          }

          // Fetch summaries for found IDs
          const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`;
          const summaryRes = await fetch(summaryUrl);
          const summaryData = await summaryRes.json() as any;

          const articles = ids.map((id: string) => {
            const doc = summaryData?.result?.[id];
            if (!doc) return null;
            const authors = (doc.authors || []).slice(0, 3).map((a: any) => a.name).join(", ");
            const moreAuthors = (doc.authors || []).length > 3 ? " et al." : "";
            return {
              pmid: id,
              title: doc.title || "",
              authors: authors + moreAuthors,
              journal: doc.fulljournalname || doc.source || "",
              year: doc.pubdate?.split(" ")[0] || "",
              abstract: doc.abstract || "",
              url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
            };
          }).filter(Boolean);

          return {
            articles,
            total: parseInt(searchData?.esearchresult?.count || "0"),
          };
        } catch (err: any) {
          console.error("[PubMed] Error:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "PubMed search failed" });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
