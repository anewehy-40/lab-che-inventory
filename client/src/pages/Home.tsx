import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from "recharts";
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
  Clock,
  PieChart as PieIcon,
  BarChart3,
  Loader2,
} from "lucide-react";

const HAZARD_COLORS: Record<string, string> = {
  Normal: "#10b981",
  Hazardous: "#f59e0b",
  "High Hazard": "#ef4444",
};

export default function Home() {
  const [, setLocation] = useLocation();
  const { t, isRTL, lang } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: chemicals = [], isLoading } = trpc.chemicals.list.useQuery();

  const stats = useMemo(() => {
    return {
      total: chemicals.length,
      normal: chemicals.filter(c => c.hazardLevel === "Normal").length,
      hazardous: chemicals.filter(c => c.hazardLevel === "Hazardous").length,
      highHazard: chemicals.filter(c => c.hazardLevel === "High Hazard").length,
      liquids: chemicals.filter(c => c.physicalState === "Liquid").length,
      solids: chemicals.filter(c => c.physicalState === "Powder/Solid").length,
    };
  }, [chemicals]);

  const hazardData = useMemo(
    () =>
      [
        { key: "Normal", label: t("normal"), value: stats.normal },
        { key: "Hazardous", label: t("hazardous"), value: stats.hazardous },
        { key: "High Hazard", label: t("highHazard"), value: stats.highHazard },
      ].filter(d => d.value > 0),
    [stats, t]
  );

  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of chemicals) {
      const cat = (c.category || "").trim() || t("uncategorized");
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [chemicals, t]);

  const recent = useMemo(
    () => [...chemicals].sort((a, b) => b.id - a.id).slice(0, 6),
    [chemicals]
  );

  const highHazardList = useMemo(
    () => chemicals.filter(c => c.hazardLevel === "High Hazard").slice(0, 6),
    [chemicals]
  );

  const today = new Date().toLocaleDateString(
    lang === "ar" ? "ar-EG" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

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
    <div className={`mx-auto max-w-6xl space-y-5 ${isRTL ? "text-right" : ""}`}>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-8 sm:px-9 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <FlaskConical className="pointer-events-none absolute -bottom-6 ltr:-right-4 rtl:-left-4 h-40 w-40 text-white/[0.04]" />
        <div className={`relative flex items-center gap-5 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
            <FlaskConical className="h-8 w-8 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400 sm:text-sm">
              {t("welcomeBack")}، {user?.name || t("guest")} · {today}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t("appTitle")}
            </h1>
            <p className="mt-1 text-sm text-slate-300">{t("dashboardSubtitle")}</p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Overview stats */}
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
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
                    <card.icon className={`h-5 w-5 ${card.accent}`} />
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Hazard donut */}
            <div className="rounded-xl border bg-card p-5">
              <div className={`mb-2 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <PieIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t("hazardDistribution")}
                </h3>
              </div>
              <div className="relative" dir="ltr">
                <ResponsiveContainer width="100%" height={208}>
                  <PieChart>
                    <Pie
                      data={hazardData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={56}
                      outerRadius={86}
                      paddingAngle={hazardData.length > 1 ? 2 : 0}
                      strokeWidth={0}
                    >
                      {hazardData.map(d => (
                        <Cell key={d.key} fill={HAZARD_COLORS[d.key]} />
                      ))}
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold tabular-nums text-foreground">
                    {stats.total}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("statTotal")}
                  </span>
                </div>
              </div>
              <div className={`mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5`}>
                {hazardData.map(d => (
                  <div key={d.key} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: HAZARD_COLORS[d.key] }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {d.label}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top categories */}
            <div className="rounded-xl border bg-card p-5">
              <div className={`mb-2 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t("topCategories")}
                </h3>
              </div>
              {categoryData.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  {t("noChemicalsYet")}
                </p>
              ) : (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={208}>
                    <BarChart
                      data={categoryData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RTooltip
                        cursor={{ fill: "rgba(0,0,0,0.04)" }}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="count"
                        radius={[0, 6, 6, 0]}
                        fill="#3b82f6"
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>

          {/* Recent + watchlist */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Recently added */}
            <div className="rounded-xl border bg-card p-5">
              <div className={`mb-3 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("recentlyAdded")}
                  </h3>
                </div>
                <button
                  onClick={() => setLocation("/inventory")}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t("viewAll")}
                </button>
              </div>
              {recent.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t("noChemicalsYet")}
                </p>
              ) : (
                <ul className="divide-y">
                  {recent.map(c => (
                    <li
                      key={c.id}
                      className={`flex items-center gap-3 py-2.5 ${isRTL ? "flex-row-reverse" : ""}`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: HAZARD_COLORS[c.hazardLevel] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {c.name}
                      </span>
                      {c.formula && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {c.formula}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* High hazard watchlist */}
            <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
              <div className={`mb-3 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t("highHazardWatchlist")}
                </h3>
                <span className="ms-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {stats.highHazard}
                </span>
              </div>
              {highHazardList.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t("noChemicalsYet")}
                </p>
              ) : (
                <ul className="divide-y divide-red-100">
                  {highHazardList.map(c => (
                    <li
                      key={c.id}
                      className={`flex items-center gap-3 py-2.5 ${isRTL ? "flex-row-reverse" : ""}`}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {c.name}
                      </span>
                      {c.storageConditions && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {c.storageConditions}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Quick access */}
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
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tool.iconBg}`}>
                    <tool.icon className={`h-6 w-6 ${tool.accent}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{t(tool.labelKey)}</p>
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
        </>
      )}
    </div>
  );
}
