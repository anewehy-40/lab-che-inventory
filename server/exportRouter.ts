import { Router } from "express";
import { getAllChemicals } from "./db";

export const exportRouter = Router();

// Simple CSV export that clients can open in Excel
exportRouter.get("/excel", async (req, res) => {
  try {
    const chemicals = await getAllChemicals();

    const headers = [
      "No.", "Chemical Name", "Formula", "Mol. Wt. (g/mol)", "Category",
      "Physical State", "Hazard Level", "GHS Codes", "Storage Conditions",
      "Quantity", "Unit", "Supplier", "Lot Number", "Expiry Date",
      "Location", "Notes", "Date Added",
    ];

    const escape = (val: string | null | undefined) => {
      if (val === null || val === undefined || val === "") return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = chemicals.map((c, i) => [
      i + 1,
      escape(c.name),
      escape(c.formula),
      escape(c.molecularWeight),
      escape(c.category),
      escape(c.physicalState),
      escape(c.hazardLevel),
      escape(c.ghsCodes),
      escape(c.storageConditions),
      escape(c.quantity),
      escape(c.unit),
      escape(c.supplier),
      escape(c.lotNumber),
      escape(c.expiryDate),
      escape(c.location),
      escape(c.notes),
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\r\n");

    // Add BOM for Excel UTF-8 compatibility
    const bom = "\uFEFF";
    const buffer = Buffer.from(bom + csv, "utf8");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Lab_Chemical_Inventory_${new Date().toISOString().split("T")[0]}.csv"`
    );
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error("[Export] Error:", err);
    res.status(500).json({ error: "Export failed" });
  }
});
