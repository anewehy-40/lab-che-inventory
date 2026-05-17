import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Plus,
  Trash2,
  Pencil,
  Play,
  Pause,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  NotebookPen,
  Clock,
  Beaker,
  Thermometer,
  BookMarked,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  FlaskConical,
} from "lucide-react";

type Step = {
  id: string;
  title?: string;
  description: string;
  durationMin?: number | null;
  temperature?: string;
  notes?: string;
};

// Rotating accent palette so the workflow reads like a graphical abstract.
const STEP_COLORS = [
  { badge: "bg-blue-600", bar: "bg-blue-500", soft: "text-blue-700" },
  { badge: "bg-violet-600", bar: "bg-violet-500", soft: "text-violet-700" },
  { badge: "bg-emerald-600", bar: "bg-emerald-500", soft: "text-emerald-700" },
  { badge: "bg-amber-600", bar: "bg-amber-500", soft: "text-amber-700" },
  { badge: "bg-rose-600", bar: "bg-rose-500", soft: "text-rose-700" },
  { badge: "bg-cyan-600", bar: "bg-cyan-500", soft: "text-cyan-700" },
];
type Reagent = { id: string; name: string; amount: number; unit: string };
type Citation = { id: string; citation: string; url?: string };
type ProtocolData = {
  id: number;
  title: string;
  category: string | null;
  description: string | null;
  steps: Step[];
  reagents: Reagent[];
  citations: Citation[];
};
type Draft = {
  title: string;
  category: string;
  description: string;
  steps: Step[];
  reagents: Reagent[];
  citations: Citation[];
};

const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const emptyDraft = (): Draft => ({
  title: "",
  category: "",
  description: "",
  steps: [],
  reagents: [],
  citations: [],
});

type View =
  | { name: "list" }
  | { name: "edit"; protocol: ProtocolData | null }
  | { name: "detail"; id: number }
  | { name: "run"; protocol: ProtocolData };

export default function Protocols() {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [view, setView] = useState<View>({ name: "list" });

  const protocolsQuery = trpc.researchProtocols.list.useQuery();
  const protocols = (protocolsQuery.data ?? []) as ProtocolData[];

  if (view.name === "edit") {
    return (
      <ProtocolEditor
        existing={view.protocol}
        onDone={() => {
          protocolsQuery.refetch();
          setView({ name: "list" });
        }}
        onCancel={() => setView({ name: "list" })}
      />
    );
  }

  if (view.name === "detail") {
    const protocol = protocols.find(p => p.id === view.id);
    if (!protocol) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          {t("loading")}
        </div>
      );
    }
    return (
      <ProtocolDetail
        protocol={protocol}
        isAdmin={isAdmin}
        onBack={() => setView({ name: "list" })}
        onEdit={() => setView({ name: "edit", protocol })}
        onRun={() => setView({ name: "run", protocol })}
        onDeleted={() => {
          protocolsQuery.refetch();
          setView({ name: "list" });
        }}
      />
    );
  }

  if (view.name === "run") {
    return (
      <RunMode
        protocol={view.protocol}
        defaultPerformer={user?.name ?? ""}
        onExit={() => setView({ name: "detail", id: view.protocol.id })}
      />
    );
  }

  return (
    <ProtocolList
      protocols={protocols}
      loading={protocolsQuery.isLoading}
      isAdmin={isAdmin}
      isRTL={isRTL}
      onNew={() => setView({ name: "edit", protocol: null })}
      onOpen={id => setView({ name: "detail", id })}
    />
  );
}

// ── List view + Lab Notebook ──────────────────────────────────────────────────

function ProtocolList({
  protocols,
  loading,
  isAdmin,
  isRTL,
  onNew,
  onOpen,
}: {
  protocols: ProtocolData[];
  loading: boolean;
  isAdmin: boolean;
  isRTL: boolean;
  onNew: () => void;
  onOpen: (id: number) => void;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"protocols" | "notebook">("protocols");

  return (
    <div className={`mx-auto max-w-5xl space-y-5 ${isRTL ? "text-right" : ""}`}>
      <div className={`flex items-center justify-between gap-3 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className={`flex items-center gap-2 text-2xl font-bold text-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
            <ClipboardList className="h-6 w-6 text-primary" />
            {t("protocolsTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("protocolsSubtitle")}
          </p>
        </div>
        {isAdmin && tab === "protocols" && (
          <Button onClick={onNew} className={`gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Plus className="h-4 w-4" />
            {t("newProtocol")}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        {(["protocols", "notebook"] as const).map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
              tab === key
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "protocols" ? (
              <ClipboardList className="h-3.5 w-3.5" />
            ) : (
              <NotebookPen className="h-3.5 w-3.5" />
            )}
            {key === "protocols" ? t("protocolsTitle") : t("labNotebook")}
          </button>
        ))}
      </div>

      {tab === "protocols" ? (
        loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {t("loading")}
          </p>
        ) : protocols.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("noProtocolsYet")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {protocols.map(p => {
              const totalMin = p.steps.reduce(
                (s, x) => s + (x.durationMin || 0),
                0
              );
              return (
                <button
                  key={p.id}
                  onClick={() => onOpen(p.id)}
                  className={`group rounded-xl border bg-card p-4 text-left transition-all hover:border-foreground/20 hover:shadow-md ${
                    isRTL ? "text-right" : ""
                  }`}
                >
                  <div className={`flex items-start justify-between gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <h3 className="font-semibold text-foreground">{p.title}</h3>
                    {p.category && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {p.category}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <div className={`mt-3 flex items-center gap-3 text-xs text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className="flex items-center gap-1">
                      <ClipboardList className="h-3.5 w-3.5" />
                      {p.steps.length} {t("stepsLabel")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Beaker className="h-3.5 w-3.5" />
                      {p.reagents.length} {t("reagentsLabel")}
                    </span>
                    {totalMin > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {totalMin} {t("minShort")}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <NotebookView isRTL={isRTL} isAdmin={isAdmin} />
      )}
    </div>
  );
}

// ── Lab Notebook ──────────────────────────────────────────────────────────────

const OUTCOME_META: Record<
  string,
  { icon: typeof CheckCircle2; cls: string; key: "outcomeSuccess" | "outcomePartial" | "outcomeFailed" }
> = {
  success: { icon: CheckCircle2, cls: "text-emerald-600", key: "outcomeSuccess" },
  partial: { icon: AlertCircle, cls: "text-amber-600", key: "outcomePartial" },
  failed: { icon: XCircle, cls: "text-red-600", key: "outcomeFailed" },
};

function NotebookView({ isRTL, isAdmin }: { isRTL: boolean; isAdmin: boolean }) {
  const { t, lang } = useLanguage();
  const logsQuery = trpc.experimentLogs.list.useQuery();
  const deleteLog = trpc.experimentLogs.delete.useMutation({
    onSuccess: () => logsQuery.refetch(),
  });
  const logs = logsQuery.data ?? [];

  if (logsQuery.isLoading) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {t("loading")}
      </p>
    );
  }
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center">
        <NotebookPen className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">{t("noLogsYet")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {logs.map(log => {
        const meta = OUTCOME_META[log.outcome] ?? OUTCOME_META.success;
        const Icon = meta.icon;
        const date = new Date(log.runAt).toLocaleDateString(
          lang === "ar" ? "ar-EG" : "en-US",
          { year: "numeric", month: "short", day: "numeric" }
        );
        return (
          <div
            key={log.id}
            className={`rounded-xl border bg-card p-4 ${isRTL ? "text-right" : ""}`}
          >
            <div className={`flex items-start justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className={`flex items-start gap-2.5 ${isRTL ? "flex-row-reverse" : ""}`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.cls}`} />
                <div>
                  <p className="font-medium text-foreground">
                    {log.protocolTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {date}
                    {log.performedBy ? ` · ${log.performedBy}` : ""}
                    {log.sampleCount
                      ? ` · ${log.sampleCount} ${t("samples")}`
                      : ""}
                  </p>
                  {log.notes && (
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {log.notes}
                    </p>
                  )}
                </div>
              </div>
              <div className={`flex shrink-0 items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className={`text-xs font-medium ${meta.cls}`}>
                  {t(meta.key)}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => deleteLog.mutate({ id: log.id })}
                    className="text-muted-foreground hover:text-red-600"
                    aria-label="delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Protocol editor / builder ─────────────────────────────────────────────────

function ProtocolEditor({
  existing,
  onDone,
  onCancel,
}: {
  existing: ProtocolData | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t, isRTL } = useLanguage();
  const chemicalsQuery = trpc.chemicals.list.useQuery();
  const chemicalNames = (chemicalsQuery.data ?? []).map(c => c.name);

  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? {
          title: existing.title,
          category: existing.category ?? "",
          description: existing.description ?? "",
          steps: existing.steps,
          reagents: existing.reagents,
          citations: existing.citations,
        }
      : emptyDraft()
  );

  const createMutation = trpc.researchProtocols.create.useMutation({
    onSuccess: () => {
      toast.success(t("protocolSavedMsg"));
      onDone();
    },
    onError: () => toast.error(t("error")),
  });
  const updateMutation = trpc.researchProtocols.update.useMutation({
    onSuccess: () => {
      toast.success(t("protocolSavedMsg"));
      onDone();
    },
    onError: () => toast.error(t("error")),
  });
  const saving = createMutation.isPending || updateMutation.isPending;

  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }));

  const save = () => {
    if (!draft.title.trim()) {
      toast.error(t("protocolTitleLabel"));
      return;
    }
    const payload = {
      title: draft.title.trim(),
      category: draft.category.trim() || undefined,
      description: draft.description.trim() || undefined,
      steps: draft.steps,
      reagents: draft.reagents,
      citations: draft.citations,
    };
    if (existing) {
      updateMutation.mutate({ id: existing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className={`mx-auto max-w-3xl space-y-5 ${isRTL ? "text-right" : ""}`}>
      <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        <button
          onClick={onCancel}
          className="rounded-lg p-1.5 hover:bg-accent"
          aria-label="back"
        >
          {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </button>
        <h1 className="text-xl font-bold text-foreground">
          {existing ? t("editProtocolTitle") : t("newProtocol")}
        </h1>
      </div>

      {/* Basic info */}
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <Label className="text-xs">{t("protocolTitleLabel")}</Label>
          <Input
            value={draft.title}
            onChange={e => set({ title: e.target.value })}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">{t("colCategory")}</Label>
            <Input
              value={draft.category}
              onChange={e => set({ category: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">{t("descriptionLabel")}</Label>
          <Textarea
            value={draft.description}
            onChange={e => set({ description: e.target.value })}
            className="mt-1"
            rows={2}
          />
        </div>
      </div>

      {/* Steps */}
      <EditorSection
        title={t("stepsLabel")}
        icon={ClipboardList}
        onAdd={() =>
          set({
            steps: [
              ...draft.steps,
              { id: uid(), title: "", description: "", durationMin: null, temperature: "", notes: "" },
            ],
          })
        }
        addLabel={t("addStep")}
        isRTL={isRTL}
      >
        {draft.steps.map((step, i) => (
          <div key={step.id} className="rounded-lg border bg-background p-3">
            <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <Input
                value={step.title ?? ""}
                placeholder={t("stepTitlePh")}
                onChange={e =>
                  set({
                    steps: draft.steps.map(s =>
                      s.id === step.id ? { ...s, title: e.target.value } : s
                    ),
                  })
                }
              />
              <button
                onClick={() =>
                  set({ steps: draft.steps.filter(s => s.id !== step.id) })
                }
                className="shrink-0 text-muted-foreground hover:text-red-600"
                aria-label="remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <Input
              value={step.description}
              placeholder={t("stepDescriptionPh")}
              onChange={e =>
                set({
                  steps: draft.steps.map(s =>
                    s.id === step.id ? { ...s, description: e.target.value } : s
                  ),
                })
              }
              className="mt-2"
            />
            <div className={`mt-2 flex flex-wrap gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Input
                type="number"
                min={0}
                value={step.durationMin ?? ""}
                placeholder={t("durationLabel")}
                onChange={e =>
                  set({
                    steps: draft.steps.map(s =>
                      s.id === step.id
                        ? {
                            ...s,
                            durationMin: e.target.value
                              ? Number(e.target.value)
                              : null,
                          }
                        : s
                    ),
                  })
                }
                className="w-32"
              />
              <Input
                value={step.temperature ?? ""}
                placeholder={t("temperatureLabel")}
                onChange={e =>
                  set({
                    steps: draft.steps.map(s =>
                      s.id === step.id ? { ...s, temperature: e.target.value } : s
                    ),
                  })
                }
                className="w-32"
              />
              <Input
                value={step.notes ?? ""}
                placeholder={t("stepNotesPh")}
                onChange={e =>
                  set({
                    steps: draft.steps.map(s =>
                      s.id === step.id ? { ...s, notes: e.target.value } : s
                    ),
                  })
                }
                className="min-w-[8rem] flex-1"
              />
            </div>
          </div>
        ))}
      </EditorSection>

      {/* Reagents */}
      <EditorSection
        title={t("reagentsLabel")}
        icon={Beaker}
        onAdd={() =>
          set({
            reagents: [
              ...draft.reagents,
              { id: uid(), name: "", amount: 0, unit: "" },
            ],
          })
        }
        addLabel={t("addReagent")}
        isRTL={isRTL}
      >
        <datalist id="chemical-names">
          {chemicalNames.map(n => (
            <option key={n} value={n} />
          ))}
        </datalist>
        {draft.reagents.map(r => (
          <div
            key={r.id}
            className={`flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3 ${
              isRTL ? "flex-row-reverse" : ""
            }`}
          >
            <Input
              list="chemical-names"
              value={r.name}
              placeholder={t("reagentNamePh")}
              onChange={e =>
                set({
                  reagents: draft.reagents.map(x =>
                    x.id === r.id ? { ...x, name: e.target.value } : x
                  ),
                })
              }
              className="min-w-[10rem] flex-1"
            />
            <Input
              type="number"
              min={0}
              step="any"
              value={r.amount || ""}
              placeholder={t("amountPerSample")}
              onChange={e =>
                set({
                  reagents: draft.reagents.map(x =>
                    x.id === r.id
                      ? { ...x, amount: Number(e.target.value) || 0 }
                      : x
                  ),
                })
              }
              className="w-32"
            />
            <Input
              value={r.unit}
              placeholder={t("unitLabel")}
              onChange={e =>
                set({
                  reagents: draft.reagents.map(x =>
                    x.id === r.id ? { ...x, unit: e.target.value } : x
                  ),
                })
              }
              className="w-24"
            />
            <button
              onClick={() =>
                set({ reagents: draft.reagents.filter(x => x.id !== r.id) })
              }
              className="text-muted-foreground hover:text-red-600"
              aria-label="remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </EditorSection>

      {/* References */}
      <EditorSection
        title={t("referencesLabel")}
        icon={BookMarked}
        onAdd={() =>
          set({
            citations: [
              ...draft.citations,
              { id: uid(), citation: "", url: "" },
            ],
          })
        }
        addLabel={t("addReference")}
        isRTL={isRTL}
      >
        {draft.citations.map(c => (
          <div
            key={c.id}
            className={`flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3 ${
              isRTL ? "flex-row-reverse" : ""
            }`}
          >
            <Input
              value={c.citation}
              placeholder={t("citationPh")}
              onChange={e =>
                set({
                  citations: draft.citations.map(x =>
                    x.id === c.id ? { ...x, citation: e.target.value } : x
                  ),
                })
              }
              className="min-w-[12rem] flex-1"
            />
            <Input
              value={c.url ?? ""}
              placeholder={t("urlPh")}
              onChange={e =>
                set({
                  citations: draft.citations.map(x =>
                    x.id === c.id ? { ...x, url: e.target.value } : x
                  ),
                })
              }
              className="min-w-[10rem] flex-1"
            />
            <button
              onClick={() =>
                set({ citations: draft.citations.filter(x => x.id !== c.id) })
              }
              className="text-muted-foreground hover:text-red-600"
              aria-label="remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </EditorSection>

      <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? t("loading") : t("save")}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

function EditorSection({
  title,
  icon: Icon,
  onAdd,
  addLabel,
  isRTL,
  children,
}: {
  title: string;
  icon: typeof ClipboardList;
  onAdd: () => void;
  addLabel: string;
  isRTL: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5 rounded-xl border bg-card p-4">
      <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
        <h3 className={`flex items-center gap-2 text-sm font-semibold text-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h3>
        <Button variant="outline" size="sm" onClick={onAdd} className="h-7 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
      {children}
    </div>
  );
}

// ── Protocol detail ───────────────────────────────────────────────────────────

function ProtocolDetail({
  protocol,
  isAdmin,
  onBack,
  onEdit,
  onRun,
  onDeleted,
}: {
  protocol: ProtocolData;
  isAdmin: boolean;
  onBack: () => void;
  onEdit: () => void;
  onRun: () => void;
  onDeleted: () => void;
}) {
  const { t, isRTL } = useLanguage();
  const [samples, setSamples] = useState(1);
  const logsQuery = trpc.experimentLogs.list.useQuery();
  const deleteMutation = trpc.researchProtocols.delete.useMutation({
    onSuccess: () => {
      toast.success(t("success"));
      onDeleted();
    },
  });

  const totalMin = protocol.steps.reduce((s, x) => s + (x.durationMin || 0), 0);
  const runs = (logsQuery.data ?? []).filter(l => l.protocolId === protocol.id);

  return (
    <div className={`mx-auto max-w-3xl space-y-5 ${isRTL ? "text-right" : ""}`}>
      {/* Header */}
      <div className={`flex items-start justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            onClick={onBack}
            className="mt-0.5 rounded-lg p-1.5 hover:bg-accent"
            aria-label="back"
          >
            {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {protocol.title}
            </h1>
            {protocol.category && (
              <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {protocol.category}
              </span>
            )}
          </div>
        </div>
        <div className={`flex shrink-0 gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          {protocol.steps.length > 0 && (
            <Button onClick={onRun} className="gap-1.5">
              <Play className="h-4 w-4" />
              {t("startRun")}
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" size="icon" onClick={onEdit} aria-label="edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (confirm(t("deleteProtocolConfirm"))) {
                    deleteMutation.mutate({ id: protocol.id });
                  }
                }}
                aria-label="delete"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      </div>

      {protocol.description && (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary ${isRTL ? "flex-row-reverse" : ""}`}>
            <FlaskConical className="h-4 w-4" />
            {t("principleLabel")}
          </h3>
          <p className="mt-1.5 text-sm text-foreground">{protocol.description}</p>
        </section>
      )}

      {/* Graphical workflow */}
      {protocol.steps.length > 0 && (
        <section>
          <div className={`mb-3 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
            <h3 className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
              <ClipboardList className="h-4 w-4" />
              {t("workflowLabel")}
            </h3>
            {totalMin > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("totalDuration")}: {totalMin} {t("minShort")}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {protocol.steps.map((step, i) => {
              const color = STEP_COLORS[i % STEP_COLORS.length];
              return (
                <div
                  key={step.id}
                  className="overflow-hidden rounded-xl border bg-card"
                >
                  <div className={`h-1.5 w-full ${color.bar}`} />
                  <div className="p-4">
                    <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${color.badge}`}
                      >
                        {i + 1}
                      </span>
                      <h4
                        className={`text-xs font-bold uppercase tracking-wide ${
                          step.title ? color.soft : "text-muted-foreground"
                        }`}
                      >
                        {step.title || `${t("stepWord")} ${i + 1}`}
                      </h4>
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      {step.description}
                    </p>
                    {(step.durationMin || step.temperature || step.notes) && (
                      <div className={`mt-2.5 flex flex-wrap gap-1.5 ${isRTL ? "flex-row-reverse" : ""}`}>
                        {step.durationMin ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {step.durationMin} {t("minShort")}
                          </span>
                        ) : null}
                        {step.temperature ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            <Thermometer className="h-3 w-3" />
                            {step.temperature}
                          </span>
                        ) : null}
                        {step.notes ? (
                          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {step.notes}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Reagents with scaler */}
      {protocol.reagents.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <div className={`mb-3 flex flex-wrap items-center justify-between gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <h3 className={`flex items-center gap-2 text-sm font-semibold text-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
              <Beaker className="h-4 w-4 text-muted-foreground" />
              {t("reagentsLabel")}
            </h3>
            <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Label className="text-xs text-muted-foreground">
                {t("numberOfSamples")}
              </Label>
              <Input
                type="number"
                min={1}
                value={samples}
                onChange={e =>
                  setSamples(Math.max(1, Number(e.target.value) || 1))
                }
                className="h-8 w-20"
              />
            </div>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {protocol.reagents.map(r => (
                <tr key={r.id}>
                  <td className="py-2 text-foreground">{r.name}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-foreground">
                    {Number((r.amount * samples).toFixed(4))} {r.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {samples > 1 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("scaledFor")} {samples} {t("samples")}
            </p>
          )}
        </section>
      )}

      {/* References */}
      {protocol.citations.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className={`mb-2 flex items-center gap-2 text-sm font-semibold text-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
            <BookMarked className="h-4 w-4 text-muted-foreground" />
            {t("referenceMethodLabel")}
          </h3>
          <ul className="space-y-1.5">
            {protocol.citations.map(c => (
              <li key={c.id} className="text-sm text-muted-foreground">
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {c.citation || c.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  c.citation
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Run history */}
      {runs.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className={`mb-2 flex items-center gap-2 text-sm font-semibold text-foreground ${isRTL ? "flex-row-reverse" : ""}`}>
            <NotebookPen className="h-4 w-4 text-muted-foreground" />
            {t("runHistory")}
          </h3>
          <ul className="divide-y">
            {runs.map(log => {
              const meta = OUTCOME_META[log.outcome] ?? OUTCOME_META.success;
              const Icon = meta.icon;
              return (
                <li
                  key={log.id}
                  className={`flex items-center gap-2 py-2 text-sm ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.cls}`} />
                  <span className="text-muted-foreground">
                    {new Date(log.runAt).toLocaleDateString()}
                  </span>
                  {log.performedBy && (
                    <span className="text-foreground">· {log.performedBy}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// ── Run Mode ──────────────────────────────────────────────────────────────────

function StepTimer({ minutes }: { minutes: number }) {
  const { t } = useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (secondsLeft === 0 && running) setRunning(false);
  }, [secondsLeft, running]);

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const done = secondsLeft === 0;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`font-mono text-sm tabular-nums ${
          done ? "font-semibold text-emerald-600" : "text-foreground"
        }`}
      >
        {mm}:{ss}
      </span>
      {!done && (
        <button
          onClick={() => setRunning(r => !r)}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={running ? t("pauseTimer") : t("startTimer")}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      )}
      <button
        onClick={() => {
          setRunning(false);
          setSecondsLeft(minutes * 60);
        }}
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="reset"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RunMode({
  protocol,
  defaultPerformer,
  onExit,
}: {
  protocol: ProtocolData;
  defaultPerformer: string;
  onExit: () => void;
}) {
  const { t, isRTL } = useLanguage();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [logOpen, setLogOpen] = useState(false);
  const [performedBy, setPerformedBy] = useState(defaultPerformer);
  const [sampleCount, setSampleCount] = useState(1);
  const [outcome, setOutcome] = useState<"success" | "partial" | "failed">("success");
  const [notes, setNotes] = useState("");

  const logMutation = trpc.experimentLogs.create.useMutation({
    onSuccess: () => {
      toast.success(t("runLogged"));
      setLogOpen(false);
      onExit();
    },
    onError: () => toast.error(t("error")),
  });

  const completed = protocol.steps.filter(s => done[s.id]).length;
  const total = protocol.steps.length;
  const allDone = total > 0 && completed === total;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={`mx-auto max-w-2xl space-y-4 ${isRTL ? "text-right" : ""}`}>
      <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        <button
          onClick={onExit}
          className="rounded-lg p-1.5 hover:bg-accent"
          aria-label="back"
        >
          {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        </button>
        <div>
          <p className="text-xs font-medium text-primary">{t("runModeTitle")}</p>
          <h1 className="text-lg font-bold text-foreground">{protocol.title}</h1>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl border bg-card p-4">
        <div className={`mb-2 flex items-center justify-between text-sm ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="font-medium text-foreground">
            {completed} / {total} {t("stepsLabel")}
          </span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {allDone && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            {t("allStepsDone")}
          </p>
        )}
      </div>

      {/* Steps */}
      <ol className="space-y-2.5">
        {protocol.steps.map((step, i) => {
          const isDone = !!done[step.id];
          return (
            <li
              key={step.id}
              className={`rounded-xl border p-4 transition-colors ${
                isDone ? "border-emerald-200 bg-emerald-50/50" : "bg-card"
              }`}
            >
              <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <button
                  onClick={() =>
                    setDone(d => ({ ...d, [step.id]: !d[step.id] }))
                  }
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    isDone
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-muted-foreground/30 hover:border-primary"
                  }`}
                  aria-label="toggle step"
                >
                  {isDone && <CheckCircle2 className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      isDone
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    <span className="font-semibold">
                      {t("stepWord")} {i + 1}.
                    </span>{" "}
                    {step.description}
                  </p>
                  <div className={`mt-1.5 flex flex-wrap items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    {step.temperature ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Thermometer className="h-3 w-3" />
                        {step.temperature}
                      </span>
                    ) : null}
                    {step.durationMin ? (
                      <StepTimer minutes={step.durationMin} />
                    ) : null}
                    {step.notes ? (
                      <span className="text-xs text-muted-foreground">
                        {step.notes}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <Button
        onClick={() => setLogOpen(true)}
        className="w-full gap-2"
        variant={allDone ? "default" : "outline"}
      >
        <NotebookPen className="h-4 w-4" />
        {t("finishAndLog")}
      </Button>

      {/* Finish & log dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className={isRTL ? "text-right" : ""}>
          <DialogHeader>
            <DialogTitle>{t("finishAndLog")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t("performedByLabel")}</Label>
              <Input
                value={performedBy}
                onChange={e => setPerformedBy(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">{t("numberOfSamples")}</Label>
              <Input
                type="number"
                min={1}
                value={sampleCount}
                onChange={e =>
                  setSampleCount(Math.max(1, Number(e.target.value) || 1))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">{t("outcomeLabel")}</Label>
              <Select
                value={outcome}
                onValueChange={v =>
                  setOutcome(v as "success" | "partial" | "failed")
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">{t("outcomeSuccess")}</SelectItem>
                  <SelectItem value="partial">{t("outcomePartial")}</SelectItem>
                  <SelectItem value="failed">{t("outcomeFailed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("runNotesPh")}</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={() =>
                logMutation.mutate({
                  protocolId: protocol.id,
                  protocolTitle: protocol.title,
                  performedBy: performedBy.trim() || undefined,
                  sampleCount,
                  outcome,
                  notes: notes.trim() || undefined,
                })
              }
              disabled={logMutation.isPending}
            >
              {logMutation.isPending ? t("loading") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pointer-events-none flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <FlaskConical className="h-3 w-3" />
      </div>
    </div>
  );
}
