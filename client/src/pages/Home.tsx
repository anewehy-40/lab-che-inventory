import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/contexts/LanguageContext";
import {
  FlaskConical,
  BookOpen,
  Calculator,
  Microscope,
  Bot,
  Package,
  AlertTriangle,
  ShieldAlert,
  Droplet,
  Beaker,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: chemicals = [], isLoading } = trpc.chemicals.list.useQuery();

  const stats = useMemo(() => {
    return {
      total: chemicals.length,
      hazardous: chemicals.filter(c => c.hazardLevel === "Hazardous").length,
      highHazard: chemicals.filter(c => c.hazardLevel === "High Hazard").length,
      liquids: chemicals.filter(c => c.physicalState === "Liquid").length,
      solids: chemicals.filter(c => c.physicalState === "Powder/Solid").length,
    };
  }, [chemicals]);

  const statCards = [
    { label: t("statTotal"), value: stats.total, icon: Package, accent: "text-blue-600", iconBg: "bg-blue-50" },
    { label: t("statHazardous"), value: stats.hazardous, icon: AlertTriangle, accent: "text-amber-600", iconBg: "bg-amber-50" },
    { label: t("highHazard"), value: stats.highHazard, icon: ShieldAlert, accent: "text-red-600", iconBg: "bg-red-50" },
    { label: t("liquids"), value: stats.liquids, icon: Droplet, accent: "text-cyan-600", iconBg: "bg-cyan-50" },
    { label: t("statSolids"), value: stats.solids, icon: Beaker, accent: "text-slate-600", iconBg: "bg-slate-100" },
  ];

  const tools: Array<{
    labelKey: TranslationKey;
    descKey: TranslationKey;
    icon: typeof FlaskConical;
    path: string;
    accent: string;
    iconBg: string;
    adminOnly?: boolean;
  }> = [
    { labelKey: "inventory", descKey: "inventoryDesc", icon: FlaskConical, path: "/inventory", accent: "text-blue-600", iconBg: "bg-blue-50" },
    { labelKey: "labAssistant", descKey: "labAssistantDesc", icon: BookOpen, path: "/lab-assistant", accent: "text-violet-600", iconBg: "bg-violet-50" },
    { labelKey: "dilutionCalculator", descKey: "dilutionCalculatorDesc", icon: Calculator, path: "/dilution-calculator", accent: "text-emerald-600", iconBg: "bg-emerald-50" },
    { labelKey: "researchTools", descKey: "researchToolsDesc", icon: Microscope, path: "/research-tools", accent: "text-amber-600", iconBg: "bg-amber-50" },
    { labelKey: "aiAddChemical", descKey: "aiAddChemicalDesc", icon: Bot, path: "/chat", accent: "text-rose-600", iconBg: "bg-rose-50", adminOnly: true },
  ];

  const visibleTools = tools.filter(tool => !tool.adminOnly || isAdmin);
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className={`mx-auto max-w-6xl space-y-6 ${isRTL ? "text-right" : ""}`}>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-10 sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          className={`relative flex items-center gap-5 ${isRTL ? "flex-row-reverse" : ""}`}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <FlaskConical className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t("appTitle")}
            </h1>
            <p className="mt-1.5 text-sm text-slate-300 sm:text-base">
              {t("dashboardSubtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Overview / stats */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("overview")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map(card => (
            <div
              key={card.label}
              className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}
              >
                <card.icon className={`h-5 w-5 ${card.accent}`} />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
                {isLoading ? "—" : card.value}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{card.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick access tools */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("quickAccess")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleTools.map(tool => (
            <button
              key={tool.path}
              onClick={() => setLocation(tool.path)}
              className={`group flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:border-foreground/20 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isRTL ? "flex-row-reverse text-right" : ""
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tool.iconBg}`}
              >
                <tool.icon className={`h-6 w-6 ${tool.accent}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">
                  {t(tool.labelKey)}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {t(tool.descKey)}
                </p>
              </div>
              <Arrow className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </button>
          ))}
        </div>
      </section>

      {/* Safety note */}
      <div
        className={`flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ${
          isRTL ? "flex-row-reverse text-right" : ""
        }`}
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{t("safetyNote")}</span>
      </div>
    </div>
  );
}
