import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";
import {
  FlaskConical, GitCompare, PenLine, BookOpen,
  Loader2, Send, ExternalLink, Search, Copy, CheckCheck,
  Microscope, Calendar, Users
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Protocol Generator ────────────────────────────────────────────────────────
function ProtocolGenerator() {
  const { lang, isRTL } = useLanguage();
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mutation = trpc.research.generateProtocol.useMutation();

  const examples = lang === "ar"
    ? [
        "قياس الفينولات الكلية في عصير الرمان بطريقة فولين-سيوكالتو",
        "تحديد نشاط مضادات الأكسدة بطريقة DPPH في مستخلص الزيتون",
        "قياس تركيز البروتين الكلي بطريقة Bradford",
        "تحديد محتوى الكربوهيدرات بطريقة الفينول-كبريتيك",
        "قياس نشاط الإنزيم بطريقة الطيف الضوئي",
      ]
    : [
        "Measure total phenolic content in pomegranate juice using Folin-Ciocalteu",
        "Determine antioxidant activity by DPPH assay in olive extract",
        "Measure total protein concentration using Bradford method",
        "Determine carbohydrate content using phenol-sulfuric acid method",
        "Measure enzyme activity by spectrophotometry",
      ];

  const generate = async () => {
    if (!goal.trim()) return;
    setResult(null);
    try {
      const res = await mutation.mutateAsync({ goal: goal.trim(), language: lang });
      setResult(res.protocol);
    } catch {
      toast.error(lang === "ar" ? "فشل توليد البروتوكول" : "Failed to generate protocol");
    }
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(lang === "ar" ? "تم النسخ" : "Copied!");
  };

  return (
    <div className={`flex flex-col gap-4 ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="p-2 rounded-lg bg-emerald-100 shrink-0">
          <FlaskConical className="h-5 w-5 text-emerald-700" />
        </div>
        <div className={isRTL ? "text-right" : ""}>
          <h2 className="font-bold text-gray-900">
            {lang === "ar" ? "مولّد بروتوكول التجربة" : "Experiment Protocol Generator"}
          </h2>
          <p className="text-sm text-gray-500">
            {lang === "ar"
              ? "أدخل هدف تجربتك وسيُولَّد بروتوكول كامل مع المواد والخطوات والمراجع والتحقق من المخزون"
              : "Enter your experiment goal and get a complete protocol with reagents, steps, references, and inventory check"}
          </p>
        </div>
      </div>

      {/* Example chips */}
      <div className={`flex flex-wrap gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => setGoal(ex)}
            className="text-xs px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        <Textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder={lang === "ar"
            ? "مثال: قياس الفينولات الكلية في عصير الرمان بطريقة فولين-سيوكالتو..."
            : "e.g. Measure total phenolic content in pomegranate juice using Folin-Ciocalteu..."}
          className={`flex-1 resize-none min-h-[80px] ${isRTL ? "text-right" : ""}`}
          dir={isRTL ? "rtl" : "ltr"}
          disabled={mutation.isPending}
        />
        <Button
          onClick={generate}
          disabled={!goal.trim() || mutation.isPending}
          className="self-end gap-2 bg-emerald-600 hover:bg-emerald-700 shrink-0"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {lang === "ar" ? "توليد" : "Generate"}
        </Button>
      </div>

      {mutation.isPending && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <Loader2 className="h-5 w-5 text-emerald-600 animate-spin shrink-0" />
          <p className="text-sm text-emerald-700">
            {lang === "ar"
              ? "جارٍ توليد البروتوكول مع التحقق من المخزون والمراجع العلمية..."
              : "Generating protocol with inventory check and scientific references..."}
          </p>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 ${isRTL ? "flex-row-reverse" : ""}`}>
            <span className="text-sm font-semibold text-gray-700">
              {lang === "ar" ? "البروتوكول المُولَّد" : "Generated Protocol"}
            </span>
            <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 text-xs h-7">
              {copied ? <CheckCheck className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              {lang === "ar" ? "نسخ" : "Copy"}
            </Button>
          </div>
          <div className={`p-5 prose prose-sm max-w-none overflow-auto max-h-[60vh] ${isRTL ? "text-right" : ""}`}>
            <Streamdown>{result}</Streamdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Method Comparison ─────────────────────────────────────────────────────────
function MethodComparison() {
  const { lang, isRTL } = useLanguage();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mutation = trpc.research.compareMethods.useMutation();

  const examples = lang === "ar"
    ? [
        "Bradford vs Lowry vs BCA لقياس البروتين",
        "DPPH vs ABTS لقياس مضادات الأكسدة",
        "Folin-Ciocalteu vs HPLC لقياس الفينولات",
        "طريقة الطيف الضوئي vs الفلورة لقياس الإنزيمات",
        "GC-MS vs HPLC لتحليل المركبات العضوية",
      ]
    : [
        "Bradford vs Lowry vs BCA for protein measurement",
        "DPPH vs ABTS for antioxidant activity",
        "Folin-Ciocalteu vs HPLC for phenolic content",
        "Spectrophotometry vs Fluorescence for enzyme assays",
        "GC-MS vs HPLC for organic compound analysis",
      ];

  const compare = async () => {
    if (!query.trim()) return;
    setResult(null);
    try {
      const res = await mutation.mutateAsync({ query: query.trim(), language: lang });
      setResult(res.comparison);
    } catch {
      toast.error(lang === "ar" ? "فشل المقارنة" : "Comparison failed");
    }
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(lang === "ar" ? "تم النسخ" : "Copied!");
  };

  return (
    <div className={`flex flex-col gap-4 ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="p-2 rounded-lg bg-blue-100 shrink-0">
          <GitCompare className="h-5 w-5 text-blue-700" />
        </div>
        <div className={isRTL ? "text-right" : ""}>
          <h2 className="font-bold text-gray-900">
            {lang === "ar" ? "مقارنة الطرق التحليلية" : "Analytical Method Comparison"}
          </h2>
          <p className="text-sm text-gray-500">
            {lang === "ar"
              ? "اسأل عن أي طريقتين أو أكثر وستحصل على جدول مقارنة شامل مع التوصية النهائية"
              : "Ask about any two or more methods and get a comprehensive comparison table with a final recommendation"}
          </p>
        </div>
      </div>

      <div className={`flex flex-wrap gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => setQuery(ex)}
            className="text-xs px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && compare()}
          placeholder={lang === "ar"
            ? "مثال: Bradford vs Lowry vs BCA لقياس البروتين..."
            : "e.g. Bradford vs Lowry vs BCA for protein measurement..."}
          className={`flex-1 ${isRTL ? "text-right" : ""}`}
          dir={isRTL ? "rtl" : "ltr"}
          disabled={mutation.isPending}
        />
        <Button
          onClick={compare}
          disabled={!query.trim() || mutation.isPending}
          className="gap-2 bg-blue-600 hover:bg-blue-700 shrink-0"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
          {lang === "ar" ? "قارن" : "Compare"}
        </Button>
      </div>

      {mutation.isPending && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
          <p className="text-sm text-blue-700">
            {lang === "ar"
              ? "جارٍ تحليل الطرق ومقارنتها بناءً على الأدبيات العلمية..."
              : "Analyzing and comparing methods based on scientific literature..."}
          </p>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 ${isRTL ? "flex-row-reverse" : ""}`}>
            <span className="text-sm font-semibold text-gray-700">
              {lang === "ar" ? "نتيجة المقارنة" : "Comparison Result"}
            </span>
            <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 text-xs h-7">
              {copied ? <CheckCheck className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              {lang === "ar" ? "نسخ" : "Copy"}
            </Button>
          </div>
          <div className={`p-5 prose prose-sm max-w-none overflow-auto max-h-[60vh] ${isRTL ? "text-right" : ""}`}>
            <Streamdown>{result}</Streamdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scientific Writing Assistant ──────────────────────────────────────────────
function ScientificWriting() {
  const { lang, isRTL } = useLanguage();
  const [section, setSection] = useState<"materials_methods" | "results" | "both">("materials_methods");
  const [rawData, setRawData] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mutation = trpc.research.writeSection.useMutation();

  const sectionOptions = [
    {
      value: "materials_methods" as const,
      label: lang === "ar" ? "المواد والطرق" : "Materials & Methods",
    },
    {
      value: "results" as const,
      label: lang === "ar" ? "النتائج" : "Results",
    },
    {
      value: "both" as const,
      label: lang === "ar" ? "كلاهما" : "Both Sections",
    },
  ];

  const placeholder = lang === "ar"
    ? `مثال على البيانات الخام:
- الطريقة المستخدمة: Bradford لقياس البروتين
- الأجهزة: مطياف ضوئي UV-Vis عند 595 نانومتر
- العينات: 20 عينة من مستخلص بذور الرمان
- النتائج: متوسط تركيز البروتين = 2.34 ± 0.12 mg/mL
- نطاق القياس: 0.5 - 5.0 mg/mL
- معامل الارتباط: R² = 0.998
- المرجع: Bradford (1976)`
    : `Example raw data:
- Method: Bradford protein assay
- Equipment: UV-Vis spectrophotometer at 595 nm
- Samples: 20 samples from pomegranate seed extract
- Results: mean protein concentration = 2.34 ± 0.12 mg/mL
- Linear range: 0.5 - 5.0 mg/mL
- Correlation coefficient: R² = 0.998
- Reference: Bradford (1976)`;

  const write = async () => {
    if (!rawData.trim()) return;
    setResult(null);
    try {
      const res = await mutation.mutateAsync({ section, rawData: rawData.trim(), language: lang });
      setResult(res.text);
    } catch {
      toast.error(lang === "ar" ? "فشلت الكتابة" : "Writing failed");
    }
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(lang === "ar" ? "تم النسخ" : "Copied!");
  };

  return (
    <div className={`flex flex-col gap-4 ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="p-2 rounded-lg bg-purple-100 shrink-0">
          <PenLine className="h-5 w-5 text-purple-700" />
        </div>
        <div className={isRTL ? "text-right" : ""}>
          <h2 className="font-bold text-gray-900">
            {lang === "ar" ? "مساعد الكتابة العلمية" : "Scientific Writing Assistant"}
          </h2>
          <p className="text-sm text-gray-500">
            {lang === "ar"
              ? "أدخل بياناتك الخام وملاحظاتك وسيُكتب القسم العلمي بأسلوب أكاديمي جاهز للنشر"
              : "Enter your raw data and notes and get an academic-style section ready for journal submission"}
          </p>
        </div>
      </div>

      {/* Section selector */}
      <div className={`flex gap-2 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
        {sectionOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSection(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              section === opt.value
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Textarea
        value={rawData}
        onChange={e => setRawData(e.target.value)}
        placeholder={placeholder}
        className={`resize-none min-h-[160px] font-mono text-sm ${isRTL ? "text-right" : ""}`}
        dir={isRTL ? "rtl" : "ltr"}
        disabled={mutation.isPending}
      />

      <Button
        onClick={write}
        disabled={!rawData.trim() || mutation.isPending}
        className="gap-2 bg-purple-600 hover:bg-purple-700 self-start"
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
        {lang === "ar" ? "اكتب القسم" : "Write Section"}
      </Button>

      {mutation.isPending && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-50 border border-purple-200">
          <Loader2 className="h-5 w-5 text-purple-600 animate-spin shrink-0" />
          <p className="text-sm text-purple-700">
            {lang === "ar"
              ? "جارٍ صياغة النص العلمي بأسلوب أكاديمي..."
              : "Drafting academic text in journal-ready style..."}
          </p>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 ${isRTL ? "flex-row-reverse" : ""}`}>
            <span className="text-sm font-semibold text-gray-700">
              {lang === "ar" ? "النص المُولَّد" : "Generated Text"}
            </span>
            <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 text-xs h-7">
              {copied ? <CheckCheck className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              {lang === "ar" ? "نسخ" : "Copy"}
            </Button>
          </div>
          <div className={`p-5 prose prose-sm max-w-none overflow-auto max-h-[60vh] ${isRTL ? "text-right" : ""}`}>
            <Streamdown>{result}</Streamdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PubMed Literature Search ──────────────────────────────────────────────────
type Article = {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  url: string;
};

function LiteratureSearch() {
  const { lang, isRTL } = useLanguage();
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const mutation = trpc.research.searchPubmed.useMutation();

  const examples = lang === "ar"
    ? [
        "Folin-Ciocalteu total phenolic",
        "DPPH antioxidant assay plant extract",
        "Bradford protein assay",
        "pomegranate phenolic compounds",
        "olive oil polyphenols HPLC",
      ]
    : [
        "Folin-Ciocalteu total phenolic",
        "DPPH antioxidant assay plant extract",
        "Bradford protein assay",
        "pomegranate phenolic compounds",
        "olive oil polyphenols HPLC",
      ];

  const search = async () => {
    if (!query.trim()) return;
    setArticles([]);
    try {
      const res = await mutation.mutateAsync({ query: query.trim(), maxResults: 10 });
      setArticles(res.articles as Article[]);
      setTotal(res.total);
      if (res.articles.length === 0) {
        toast.info(lang === "ar" ? "لم يتم العثور على نتائج" : "No results found");
      }
    } catch {
      toast.error(lang === "ar" ? "فشل البحث في PubMed" : "PubMed search failed");
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="p-2 rounded-lg bg-amber-100 shrink-0">
          <BookOpen className="h-5 w-5 text-amber-700" />
        </div>
        <div className={isRTL ? "text-right" : ""}>
          <h2 className="font-bold text-gray-900">
            {lang === "ar" ? "بحث في الأدبيات العلمية (PubMed)" : "Literature Search (PubMed)"}
          </h2>
          <p className="text-sm text-gray-500">
            {lang === "ar"
              ? "ابحث مباشرة في قاعدة بيانات PubMed عن أحدث الأوراق البحثية المتعلقة بمادتك أو طريقتك التحليلية"
              : "Search PubMed directly for the latest papers related to your chemical or analytical method"}
          </p>
        </div>
      </div>

      <div className={`flex flex-wrap gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => setQuery(ex)}
            className="text-xs px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
          placeholder={lang === "ar"
            ? "ابحث بالكلمات المفتاحية بالإنجليزية... مثال: DPPH antioxidant assay"
            : "Search by keywords... e.g. DPPH antioxidant assay"}
          className={`flex-1 ${isRTL ? "text-right" : ""}`}
          dir="ltr"
          disabled={mutation.isPending}
        />
        <Button
          onClick={search}
          disabled={!query.trim() || mutation.isPending}
          className="gap-2 bg-amber-600 hover:bg-amber-700 shrink-0"
        >
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {lang === "ar" ? "بحث" : "Search"}
        </Button>
      </div>

      {mutation.isPending && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <Loader2 className="h-5 w-5 text-amber-600 animate-spin shrink-0" />
          <p className="text-sm text-amber-700">
            {lang === "ar" ? "جارٍ البحث في قاعدة بيانات PubMed..." : "Searching PubMed database..."}
          </p>
        </div>
      )}

      {articles.length > 0 && (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Microscope className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {lang === "ar"
                ? `عرض ${articles.length} من أصل ${total.toLocaleString()} نتيجة`
                : `Showing ${articles.length} of ${total.toLocaleString()} results`}
            </span>
          </div>

          {articles.map(article => (
            <div
              key={article.pmid}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:border-amber-300 hover:shadow-sm transition-all"
            >
              <div className={`flex items-start justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
                  <h3 className="font-semibold text-sm text-gray-900 leading-snug mb-1.5" dir="ltr">
                    {article.title}
                  </h3>
                  <div className={`flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Users className="h-3 w-3" />
                      <span dir="ltr">{article.authors}</span>
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="italic" dir="ltr">{article.journal}</span>
                    <span className="text-gray-300">·</span>
                    <span className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      {article.year}
                    </span>
                    <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                      PMID: {article.pmid}
                    </Badge>
                  </div>

                  {expanded === article.pmid && article.abstract && (
                    <p className="text-xs text-gray-600 leading-relaxed mt-2 p-3 bg-gray-50 rounded-lg" dir="ltr">
                      {article.abstract}
                    </p>
                  )}
                </div>

                <div className={`flex flex-col gap-1.5 shrink-0 ${isRTL ? "items-start" : "items-end"}`}>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <ExternalLink className="h-3 w-3" />
                    PubMed
                  </a>
                  {article.abstract && (
                    <button
                      onClick={() => setExpanded(expanded === article.pmid ? null : article.pmid)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      {expanded === article.pmid
                        ? (lang === "ar" ? "إخفاء" : "Hide")
                        : (lang === "ar" ? "الملخص" : "Abstract")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ResearchTools() {
  const { lang, isRTL, t } = useLanguage();

  const tabs = [
    {
      value: "protocol",
      icon: FlaskConical,
      label: lang === "ar" ? "مولّد البروتوكول" : "Protocol Generator",
      color: "text-emerald-600",
    },
    {
      value: "compare",
      icon: GitCompare,
      label: lang === "ar" ? "مقارنة الطرق" : "Method Comparison",
      color: "text-blue-600",
    },
    {
      value: "writing",
      icon: PenLine,
      label: lang === "ar" ? "الكتابة العلمية" : "Scientific Writing",
      color: "text-purple-600",
    },
    {
      value: "pubmed",
      icon: BookOpen,
      label: lang === "ar" ? "بحث PubMed" : "PubMed Search",
      color: "text-amber-600",
    },
  ];

  return (
    <div className={`max-w-4xl mx-auto px-4 py-6 space-y-5 ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="p-2 rounded-lg bg-indigo-100">
          <Microscope className="h-5 w-5 text-indigo-700" />
        </div>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-xl font-bold text-gray-900">
            {lang === "ar" ? "أدوات البحث العلمي" : "Research Tools"}
          </h1>
          <p className="text-sm text-gray-500">
            {lang === "ar"
              ? "مولّد البروتوكولات · مقارنة الطرق · الكتابة العلمية · بحث PubMed"
              : "Protocol Generator · Method Comparison · Scientific Writing · PubMed Search"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="protocol" className="w-full">
        <TabsList className={`grid w-full grid-cols-4 mb-6 h-auto ${isRTL ? "flex-row-reverse" : ""}`}>
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex flex-col items-center gap-1 py-2.5 text-xs data-[state=active]:shadow-sm"
            >
              <tab.icon className={`h-4 w-4 ${tab.color}`} />
              <span className="hidden sm:block leading-tight text-center">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="protocol" className="mt-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ProtocolGenerator />
          </div>
        </TabsContent>

        <TabsContent value="compare" className="mt-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <MethodComparison />
          </div>
        </TabsContent>

        <TabsContent value="writing" className="mt-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ScientificWriting />
          </div>
        </TabsContent>

        <TabsContent value="pubmed" className="mt-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <LiteratureSearch />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
