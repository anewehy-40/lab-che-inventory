import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Pencil, Trash2, FlaskConical, Download, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import type { Chemical } from "../../../drizzle/schema";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

type View = "all" | "powder" | "liquid" | "highhazard";

function HazardBadge({ level, t }: { level: string; t: (k: any) => string }) {
  const cls =
    level === "Normal"
      ? "hazard-normal"
      : level === "Hazardous"
      ? "hazard-hazardous"
      : "hazard-high";
  const label =
    level === "High Hazard"
      ? `⚠ ${t("highHazard")}`
      : level === "Hazardous"
      ? `⚡ ${t("hazardous")}`
      : `✓ ${t("normal")}`;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function rowClass(level: string) {
  if (level === "Normal") return "row-normal hover:brightness-95";
  if (level === "Hazardous") return "row-hazardous hover:brightness-95";
  return "row-high hover:brightness-95";
}

export default function Inventory() {
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [hazardFilter, setHazardFilter] = useState<string>("all");
  const [editChemical, setEditChemical] = useState<Chemical | null>(null);
  const [editForm, setEditForm] = useState<Partial<Chemical>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { t, isRTL, lang } = useLanguage();

  const { data: chemicals = [], isLoading, refetch } = trpc.chemicals.list.useQuery();
  const updateMutation = trpc.chemicals.update.useMutation({
    onSuccess: () => { toast.success(t("success")); refetch(); setEditChemical(null); },
    onError: () => toast.error(t("error")),
  });
  const deleteMutation = trpc.chemicals.delete.useMutation({
    onSuccess: () => { toast.success(t("success")); refetch(); setDeleteId(null); },
    onError: () => toast.error(t("error")),
  });

  const VIEW_LABELS: Record<View, string> = {
    all: t("allChemicals"),
    powder: t("powdersSolids"),
    liquid: t("liquids"),
    highhazard: t("highHazard"),
  };

  const TABLE_HEADERS = [
    t("colNumber"), t("colName"), t("colFormula"), t("colMolWeight"),
    t("colCategory"), t("colHazard"), t("colGHS"), t("colStorage"),
    t("colNotes"), t("colActions"),
  ];

  const filtered = useMemo(() => {
    let list = chemicals;
    if (view === "powder") list = list.filter(c => c.physicalState === "Powder/Solid");
    if (view === "liquid") list = list.filter(c => c.physicalState === "Liquid");
    if (view === "highhazard") list = list.filter(c => c.hazardLevel === "High Hazard");
    if (hazardFilter !== "all") list = list.filter(c => c.hazardLevel === hazardFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.formula || "").toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q) ||
        (c.hazardLevel || "").toLowerCase().includes(q) ||
        (c.ghsCodes || "").toLowerCase().includes(q) ||
        (c.location || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [chemicals, view, search, hazardFilter]);

  const openEdit = useCallback((chem: Chemical) => {
    setEditChemical(chem);
    setEditForm({
      quantity: chem.quantity || "",
      unit: chem.unit || "",
      supplier: chem.supplier || "",
      lotNumber: chem.lotNumber || "",
      expiryDate: chem.expiryDate || "",
      location: chem.location || "",
      notes: chem.notes || "",
    });
  }, []);

  const saveEdit = () => {
    if (!editChemical) return;
    const cleanData = Object.fromEntries(
      Object.entries(editForm).filter(([, v]) => v !== null)
    ) as Parameters<typeof updateMutation.mutate>[0]["data"];
    updateMutation.mutate({ id: editChemical.id, data: cleanData });
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/export/excel");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Lab_Chemical_Inventory.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("success"));
    } catch {
      toast.error(t("error"));
    }
  };

  const counts = useMemo(() => ({
    all: chemicals.length,
    powder: chemicals.filter(c => c.physicalState === "Powder/Solid").length,
    liquid: chemicals.filter(c => c.physicalState === "Liquid").length,
    highhazard: chemicals.filter(c => c.hazardLevel === "High Hazard").length,
  }), [chemicals]);

  return (
    <div className={`flex flex-col gap-4 h-full ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between flex-wrap gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className={`text-2xl font-bold text-foreground flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <FlaskConical className="w-6 h-6 text-primary" />
            {t("chemicalInventory")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} {lang === "ar" ? "من" : "of"} {chemicals.length} {t("chemicalsShown")}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} className={`gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Download className="w-4 h-4" />
          {t("exportExcel")}
        </Button>
      </div>

      {/* View tabs */}
      <div className={`flex gap-2 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
        {(Object.keys(VIEW_LABELS) as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              view === v
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {VIEW_LABELS[v]}
            <span className={`${isRTL ? "mr-1.5" : "ml-1.5"} text-xs px-1.5 py-0.5 rounded-full ${view === v ? "bg-white/20" : "bg-muted"}`}>
              {counts[v]}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className={`flex gap-3 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={isRTL ? "pr-9 text-right" : "pl-9"}
            dir={isRTL ? "rtl" : "ltr"}
          />
        </div>
        <Select value={hazardFilter} onValueChange={setHazardFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("allHazardLevels")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allHazardLevels")}</SelectItem>
            <SelectItem value="Normal">{t("normal")}</SelectItem>
            <SelectItem value="Hazardous">{t("hazardous")}</SelectItem>
            <SelectItem value="High Hazard">{t("highHazard")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className={`flex gap-3 text-xs flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
        <span className={`flex items-center gap-1.5 ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
          {t("normalLegend")}
        </span>
        <span className={`flex items-center gap-1.5 ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
          {t("hazardousLegend")}
        </span>
        <span className={`flex items-center gap-1.5 ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
          {t("highHazardLegend")}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-auto shadow-sm flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
            <p className="font-medium">{t("noChemicalsFound")}</p>
            <p className="text-xs">{t("tryAdjusting")}</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse" dir={isRTL ? "rtl" : "ltr"}>
            <thead>
              <tr className="bg-primary text-primary-foreground sticky top-0 z-10">
                {TABLE_HEADERS.map(h => (
                  <th key={h} className={`px-3 py-2.5 ${isRTL ? "text-right" : "text-left"} font-semibold text-xs whitespace-nowrap border-r border-primary/30 last:border-r-0`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((chem, idx) => (
                <>
                <tr key={chem.id} className={`${rowClass(chem.hazardLevel)} border-b border-border/60 transition-colors cursor-pointer`} onClick={() => setExpandedRow(expandedRow === chem.id ? null : chem.id)}>
                  <td className="px-3 py-2 text-muted-foreground text-xs font-mono">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium min-w-[160px]">{chem.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{chem.formula || "—"}</td>
                  <td className="px-3 py-2 text-xs text-center">{chem.molecularWeight || "—"}</td>
                  <td className="px-3 py-2 text-xs">{chem.category || "—"}</td>
                  <td className="px-3 py-2"><HazardBadge level={chem.hazardLevel} t={t} /></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{chem.ghsCodes || "—"}</td>
                  <td className="px-3 py-2 text-xs">{chem.storageConditions || "—"}</td>
                  <td className="px-3 py-2 text-xs max-w-[160px] truncate" title={chem.notes || ""}>{chem.notes || <span className="text-muted-foreground/50">—</span>}</td>
                  <td className="px-3 py-2">
                    <div className={`flex gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                      {isAdmin && (
                        <button onClick={e => { e.stopPropagation(); openEdit(chem); }} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title={t("editChemical")}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={e => { e.stopPropagation(); setDeleteId(chem.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title={t("deleteChemical")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); setExpandedRow(expandedRow === chem.id ? null : chem.id); }} className="p-1 rounded hover:bg-blue-100 text-muted-foreground hover:text-blue-600 transition-colors" title={t("scientificUses")}>
                        {expandedRow === chem.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedRow === chem.id && (
                  <tr key={`${chem.id}-uses`} className="bg-blue-50/60 border-b border-blue-200">
                    <td colSpan={10} className="px-5 py-3">
                      <div className={`flex gap-2 items-start ${isRTL ? "flex-row-reverse text-right" : ""}`}>
                        <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-1">
                            {t("scientificUses")} — {chem.name}
                          </p>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {(chem as any).scientificUses || t("noScientificUses")}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editChemical} onOpenChange={open => !open && setEditChemical(null)}>
        <DialogContent className="max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className={isRTL ? "text-right" : ""}>{t("editChemical")}: {editChemical?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {[
              { key: "quantity", label: lang === "ar" ? "الكمية" : "Quantity" },
              { key: "unit", label: lang === "ar" ? "الوحدة" : "Unit (g, mL, L, kg...)" },
              { key: "supplier", label: lang === "ar" ? "المورد" : "Supplier" },
              { key: "lotNumber", label: lang === "ar" ? "رقم الدفعة" : "Lot Number" },
              { key: "expiryDate", label: lang === "ar" ? "تاريخ الانتهاء" : "Expiry Date" },
              { key: "location", label: lang === "ar" ? "موقع التخزين" : "Storage Location" },
            ].map(({ key, label }) => (
              <div key={key} className={`flex flex-col gap-1 ${isRTL ? "text-right" : ""}`}>
                <Label className="text-xs">{label}</Label>
                <Input
                  value={(editForm as any)[key] || ""}
                  onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={label}
                  className="h-8 text-sm"
                  dir={isRTL ? "rtl" : "ltr"}
                />
              </div>
            ))}
            <div className={`col-span-2 flex flex-col gap-1 ${isRTL ? "text-right" : ""}`}>
              <Label className="text-xs">{lang === "ar" ? "ملاحظات / مرجع SDS" : "Notes / SDS Reference"}</Label>
              <Input
                value={editForm.notes || ""}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={lang === "ar" ? "ملاحظات السلامة..." : "Safety notes, SDS reference..."}
                className="h-8 text-sm"
                dir={isRTL ? "rtl" : "ltr"}
              />
            </div>
          </div>
          <DialogFooter className={isRTL ? "flex-row-reverse" : ""}>
            <Button variant="outline" onClick={() => setEditChemical(null)}>{t("cancel")}</Button>
            <Button onClick={saveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t("loading") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className={isRTL ? "text-right" : ""}>{lang === "ar" ? "حذف المادة؟" : "Delete Chemical?"}</DialogTitle>
          </DialogHeader>
          <p className={`text-sm text-muted-foreground ${isRTL ? "text-right" : ""}`}>
            {lang === "ar"
              ? "سيتم حذف المادة نهائياً من المخزون. لا يمكن التراجع عن هذا الإجراء."
              : "This will permanently remove the chemical from the inventory. This action cannot be undone."}
          </p>
          <DialogFooter className={isRTL ? "flex-row-reverse" : ""}>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t("cancel")}</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? t("loading") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
