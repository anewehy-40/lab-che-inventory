import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, FlaskConical, Beaker, RefreshCw, CheckCircle2, Camera, X, Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

// ── C1V1 = C2V2 Dilution ─────────────────────────────────────────────────────
type DilutionField = "C1" | "V1" | "C2" | "V2";

const CONC_UNITS = ["M", "mM", "µM", "nM", "mg/mL", "µg/mL", "ng/mL", "%", "g/L"];
const VOL_UNITS = ["L", "mL", "µL"];

function toBase(value: number, unit: string, type: "conc" | "vol"): number {
  if (type === "conc") {
    if (unit === "M") return value;
    if (unit === "mM") return value * 1e-3;
    if (unit === "µM") return value * 1e-6;
    if (unit === "nM") return value * 1e-9;
    return value;
  } else {
    if (unit === "L") return value;
    if (unit === "mL") return value * 1e-3;
    if (unit === "µL") return value * 1e-6;
    return value;
  }
}

function fromBase(value: number, unit: string, type: "conc" | "vol"): number {
  if (type === "conc") {
    if (unit === "M") return value;
    if (unit === "mM") return value / 1e-3;
    if (unit === "µM") return value / 1e-6;
    if (unit === "nM") return value / 1e-9;
    return value;
  } else {
    if (unit === "L") return value;
    if (unit === "mL") return value / 1e-3;
    if (unit === "µL") return value / 1e-6;
    return value;
  }
}

function formatNum(n: number): string {
  if (n === 0) return "0";
  if (Math.abs(n) < 0.001 || Math.abs(n) >= 1e6) return n.toExponential(4);
  return parseFloat(n.toPrecision(6)).toString();
}

// ── Scan Label Component ──────────────────────────────────────────────────────
type ScannedData = {
  name: string | null;
  concentration_percent: number | null;
  concentration_molarity: number | null;
  density: number | null;
  molecular_weight: number | null;
  cas_number: string | null;
  purity: number | null;
  notes: string | null;
};

type ScanLabelProps = {
  onApply: (data: ScannedData) => void;
};

function ScanLabel({ onApply }: ScanLabelProps) {
  const { lang } = useLanguage();
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const analyzeLabel = trpc.scanLabel.analyze.useMutation();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setShowCamera(true);
      // Wait for video element to mount
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error(lang === "ar" ? "الكاميرا غير متاحة. استخدم خيار الرفع." : "Camera not available. Please use the upload option.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;
    setScanning(true);
    try {
      // Extract base64 from data URL
      const base64 = capturedImage.split(",")[1];
      const mimeType = capturedImage.split(";")[0].split(":")[1];
      const result = await analyzeLabel.mutateAsync({ imageBase64: base64, mimeType });
      if (result.success && result.data) {
        setScannedData(result.data as ScannedData);
        toast.success(lang === "ar" ? "تم مسح الملصق بنجاح!" : "Label scanned successfully!");
      } else {
        toast.error(lang === "ar" ? "تعذر قراءة الملصق. جرب صورة أوضح." : "Could not read the label. Try a clearer photo.");
      }
    } catch {
      toast.error(lang === "ar" ? "فشل المسح. يرجى المحاولة مجدداً." : "Scanning failed. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setScannedData(null);
    stopCamera();
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-center gap-2">
        <ScanLine className="h-4 w-4 text-blue-600" />
        <span className="font-semibold text-blue-800 text-sm">{lang === "ar" ? "مسح ملصق المادة الكيميائية" : "Scan Chemical Label"}</span>
        <span className="text-xs text-blue-500 ml-auto">{lang === "ar" ? "وجّه الكاميرا نحو ملصق العبوة" : "Point camera at the bottle label"}</span>
      </div>

      {/* Camera view */}
      {showCamera && (
        <div className="relative rounded-lg overflow-hidden bg-black">
          <video ref={videoRef} className="w-full max-h-64 object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 border-2 border-dashed border-white/50 m-4 rounded pointer-events-none" />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
            <Button size="sm" onClick={capturePhoto} className="bg-white text-gray-900 hover:bg-gray-100">
              <Camera className="h-4 w-4 mr-1" /> {lang === "ar" ? "التقاط" : "Capture"}
            </Button>
            <Button size="sm" variant="outline" onClick={stopCamera} className="bg-white/20 text-white border-white/50">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Captured image preview */}
      {capturedImage && !showCamera && (
        <div className="relative">
          <img src={capturedImage} alt="Captured label" className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-white" />
          <button onClick={reset} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
            <X className="h-3 w-3 text-gray-600" />
          </button>
        </div>
      )}

      {/* Action buttons */}
      {!capturedImage && !showCamera && (
        <div className="flex gap-2">
          <Button size="sm" onClick={startCamera} variant="outline" className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100">
            <Camera className="h-4 w-4 mr-1" /> {lang === "ar" ? "فتح الكاميرا" : "Open Camera"}
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100">
            {lang === "ar" ? "رفع صورة" : "Upload Photo"}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {capturedImage && !scannedData && (
        <Button size="sm" onClick={analyzeImage} disabled={scanning} className="w-full bg-blue-600 hover:bg-blue-700">
          {scanning
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {lang === "ar" ? "جارٍ القراءة..." : "Reading label..."}</>
            : <><ScanLine className="h-4 w-4 mr-2" /> {lang === "ar" ? "قراءة الملصق بالذكاء الاصطناعي" : "Read Label with AI"}</>
          }
        </Button>
      )}

      {/* Scanned results */}
      {scannedData && (
        <div className="bg-white rounded-lg border border-blue-200 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-700 mb-2">{lang === "ar" ? "مستخرج من الملصق:" : "Extracted from label:"}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {scannedData.name && (
              <div className="col-span-2">
                <span className="text-gray-500">{lang === "ar" ? "المادة:" : "Chemical:"}</span>
                <span className="ml-1 font-medium text-gray-800">{scannedData.name}</span>
              </div>
            )}
            {scannedData.concentration_percent !== null && (
              <div><span className="text-gray-500">{lang === "ar" ? "التركيز:" : "Conc:"}</span> <span className="font-medium">{scannedData.concentration_percent}%</span></div>
            )}
            {scannedData.concentration_molarity !== null && (
              <div><span className="text-gray-500">{lang === "ar" ? "المولارية:" : "Molarity:"}</span> <span className="font-medium">{scannedData.concentration_molarity} M</span></div>
            )}
            {scannedData.density !== null && (
              <div><span className="text-gray-500">{lang === "ar" ? "الكثافة:" : "Density:"}</span> <span className="font-medium">{scannedData.density} g/mL</span></div>
            )}
            {scannedData.molecular_weight !== null && (
              <div><span className="text-gray-500">{lang === "ar" ? "الوزن الجزيئي:" : "MW:"}</span> <span className="font-medium">{scannedData.molecular_weight} g/mol</span></div>
            )}
            {scannedData.cas_number && (
              <div><span className="text-gray-500">CAS:</span> <span className="font-medium">{scannedData.cas_number}</span></div>
            )}
            {scannedData.purity !== null && (
              <div><span className="text-gray-500">{lang === "ar" ? "النقاء:" : "Purity:"}</span> <span className="font-medium">{scannedData.purity}%</span></div>
            )}
            {scannedData.notes && (
              <div className="col-span-2"><span className="text-gray-500">{lang === "ar" ? "ملاحظات:" : "Notes:"}</span> <span className="font-medium">{scannedData.notes}</span></div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => onApply(scannedData)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> {lang === "ar" ? "تطبيق على الحاسبة" : "Apply to Calculator"}
            </Button>
            <Button size="sm" variant="outline" onClick={reset} className="text-xs">
              {lang === "ar" ? "مسح مجدداً" : "Scan Again"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DilutionCalculator() {
  const { t, isRTL, lang } = useLanguage();
  // C1V1=C2V2 state
  const [fields, setFields] = useState({ C1: "", V1: "", C2: "", V2: "" });
  const [units, setUnits] = useState({ C1: "mM", V1: "mL", C2: "mM", V2: "mL" });
  const [solveFor, setSolveFor] = useState<DilutionField>("V1");
  const [dilResult, setDilResult] = useState<string | null>(null);
  const [dilSteps, setDilSteps] = useState<string[]>([]);

  // Mass→Solution state
  const [mass, setMass] = useState("");
  const [massUnit, setMassUnit] = useState("mg");
  const [mw, setMw] = useState("");
  const [targetConc, setTargetConc] = useState("");
  const [targetConcUnit, setTargetConcUnit] = useState("mM");
  const [massResult, setMassResult] = useState<{ volume: string; unit: string; steps: string[] } | null>(null);

  // Percent dilution state
  const [stockPercent, setStockPercent] = useState("");
  const [targetPercent, setTargetPercent] = useState("");
  const [finalVolume, setFinalVolume] = useState("");
  const [finalVolUnit, setFinalVolUnit] = useState("mL");
  const [percentResult, setPercentResult] = useState<{ stockVol: string; waterVol: string; steps: string[] } | null>(null);

  // Active tab for applying scan data
  const [activeTab, setActiveTab] = useState("c1v1");

  // Apply scanned label data to the active calculator
  const handleApplyScan = (data: ScannedData) => {
    if (activeTab === "c1v1") {
      // Apply stock concentration from label
      if (data.concentration_percent !== null) {
        setFields(prev => ({ ...prev, C1: data.concentration_percent!.toString() }));
        setUnits(prev => ({ ...prev, C1: "%" }));
        toast.success(`Applied: Stock concentration = ${data.concentration_percent}%`);
      } else if (data.concentration_molarity !== null) {
        setFields(prev => ({ ...prev, C1: data.concentration_molarity!.toString() }));
        setUnits(prev => ({ ...prev, C1: "M" }));
        toast.success(`Applied: Stock concentration = ${data.concentration_molarity} M`);
      } else {
        toast.info("No concentration found on label. Please enter manually.");
      }
    } else if (activeTab === "mass") {
      if (data.molecular_weight !== null) {
        setMw(data.molecular_weight.toString());
        toast.success(`Applied: MW = ${data.molecular_weight} g/mol`);
      } else {
        toast.info("No molecular weight found on label.");
      }
    } else if (activeTab === "percent") {
      if (data.concentration_percent !== null) {
        setStockPercent(data.concentration_percent.toString());
        toast.success(`Applied: Stock = ${data.concentration_percent}%`);
      } else {
        toast.info("No percent concentration found on label.");
      }
    }
  };

  // ── C1V1=C2V2 solver ──────────────────────────────────────────────────────
  const solveDilution = () => {
    const vals: Record<string, number | null> = {};
    for (const k of ["C1", "V1", "C2", "V2"] as DilutionField[]) {
      if (k === solveFor) { vals[k] = null; continue; }
      const v = parseFloat(fields[k]);
      if (isNaN(v) || v <= 0) { toast.error(`Please enter a valid value for ${k}`); return; }
      vals[k] = v;
    }

    let result: number;
    const steps: string[] = [];

    const c1b = vals.C1 !== null ? toBase(vals.C1!, units.C1, "conc") : null;
    const v1b = vals.V1 !== null ? toBase(vals.V1!, units.V1, "vol") : null;
    const c2b = vals.C2 !== null ? toBase(vals.C2!, units.C2, "conc") : null;
    const v2b = vals.V2 !== null ? toBase(vals.V2!, units.V2, "vol") : null;

    steps.push("Using the dilution equation: C₁V₁ = C₂V₂");

    if (solveFor === "V1") {
      result = (c2b! * v2b!) / c1b!;
      steps.push(`V₁ = (C₂ × V₂) / C₁`);
      steps.push(`V₁ = (${vals.C2} ${units.C2} × ${vals.V2} ${units.V2}) / ${vals.C1} ${units.C1}`);
      const displayed = fromBase(result, units.V1, "vol");
      steps.push(`V₁ = ${formatNum(displayed)} ${units.V1}`);
      setDilResult(`${formatNum(displayed)} ${units.V1}`);
    } else if (solveFor === "V2") {
      result = (c1b! * v1b!) / c2b!;
      steps.push(`V₂ = (C₁ × V₁) / C₂`);
      steps.push(`V₂ = (${vals.C1} ${units.C1} × ${vals.V1} ${units.V1}) / ${vals.C2} ${units.C2}`);
      const displayed = fromBase(result, units.V2, "vol");
      steps.push(`V₂ = ${formatNum(displayed)} ${units.V2}`);
      setDilResult(`${formatNum(displayed)} ${units.V2}`);
    } else if (solveFor === "C1") {
      result = (c2b! * v2b!) / v1b!;
      steps.push(`C₁ = (C₂ × V₂) / V₁`);
      const displayed = fromBase(result, units.C1, "conc");
      steps.push(`C₁ = ${formatNum(displayed)} ${units.C1}`);
      setDilResult(`${formatNum(displayed)} ${units.C1}`);
    } else {
      result = (c1b! * v1b!) / v2b!;
      steps.push(`C₂ = (C₁ × V₁) / V₂`);
      const displayed = fromBase(result, units.C2, "conc");
      steps.push(`C₂ = ${formatNum(displayed)} ${units.C2}`);
      setDilResult(`${formatNum(displayed)} ${units.C2}`);
    }

    if (solveFor === "V1") {
      const totalV2 = vals.V2!;
      const stockV = fromBase(result, units.V1, "vol");
      const waterV = totalV2 - (units.V1 === units.V2 ? stockV : fromBase(result, units.V2, "vol"));
      if (waterV > 0) steps.push(`Add ${formatNum(stockV)} ${units.V1} of stock to ${formatNum(waterV)} ${units.V2} of solvent to reach ${vals.V2} ${units.V2}`);
    }

    setDilSteps(steps);
  };

  // ── Mass → Solution solver ────────────────────────────────────────────────
  const solveMass = () => {
    const m = parseFloat(mass);
    const mwVal = parseFloat(mw);
    const c = parseFloat(targetConc);
    if (isNaN(m) || m <= 0) { toast.error("Enter a valid mass"); return; }
    if (isNaN(mwVal) || mwVal <= 0) { toast.error("Enter a valid molecular weight"); return; }
    if (isNaN(c) || c <= 0) { toast.error("Enter a valid target concentration"); return; }

    const massG = massUnit === "g" ? m : massUnit === "mg" ? m / 1000 : m / 1e6;
    let cMol: number;
    if (targetConcUnit === "M") cMol = c;
    else if (targetConcUnit === "mM") cMol = c / 1000;
    else if (targetConcUnit === "µM") cMol = c / 1e6;
    else cMol = c;

    const volL = massG / (mwVal * cMol);
    const volMl = volL * 1000;

    const steps = [
      `Formula: V = mass / (MW × C)`,
      `Mass = ${m} ${massUnit} = ${formatNum(massG)} g`,
      `MW = ${mwVal} g/mol`,
      `Target concentration = ${c} ${targetConcUnit} = ${formatNum(cMol)} mol/L`,
      `V = ${formatNum(massG)} / (${mwVal} × ${formatNum(cMol)})`,
      `V = ${formatNum(volL)} L = ${formatNum(volMl)} mL`,
    ];

    const displayVol = volMl >= 1 ? `${formatNum(volMl)} mL` : `${formatNum(volL * 1e6)} µL`;
    setMassResult({ volume: displayVol, unit: volMl >= 1 ? "mL" : "µL", steps });
  };

  // ── Percent dilution solver ───────────────────────────────────────────────
  const solvePercent = () => {
    const c1 = parseFloat(stockPercent);
    const c2 = parseFloat(targetPercent);
    const v2 = parseFloat(finalVolume);
    if (isNaN(c1) || c1 <= 0) { toast.error("Enter valid stock %"); return; }
    if (isNaN(c2) || c2 <= 0) { toast.error("Enter valid target %"); return; }
    if (isNaN(v2) || v2 <= 0) { toast.error("Enter valid final volume"); return; }
    if (c2 >= c1) { toast.error("Target % must be less than stock %"); return; }

    const v1 = (c2 * v2) / c1;
    const water = v2 - v1;

    const steps = [
      `Using C₁V₁ = C₂V₂`,
      `V₁ = (C₂ × V₂) / C₁ = (${c2}% × ${v2} ${finalVolUnit}) / ${c1}%`,
      `V₁ (stock) = ${formatNum(v1)} ${finalVolUnit}`,
      `V (solvent) = ${v2} − ${formatNum(v1)} = ${formatNum(water)} ${finalVolUnit}`,
    ];

    setPercentResult({ stockVol: formatNum(v1), waterVol: formatNum(water), steps });
  };

  const resetDilution = () => { setFields({ C1: "", V1: "", C2: "", V2: "" }); setDilResult(null); setDilSteps([]); };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="p-2 rounded-lg bg-emerald-100">
          <Calculator className="h-5 w-5 text-emerald-700" />
        </div>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-xl font-bold text-gray-900">{t("dilutionCalcTitle")}</h1>
          <p className="text-sm text-gray-500">{t("dilutionCalcSubtitle")}</p>
        </div>
      </div>

      {/* Scan Label Panel */}
      <ScanLabel onApply={handleApplyScan} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="c1v1" className="text-xs sm:text-sm">
            <FlaskConical className="h-3 w-3 mr-1" /> C₁V₁ = C₂V₂
          </TabsTrigger>
          <TabsTrigger value="mass" className="text-xs sm:text-sm">
            <Beaker className="h-3 w-3 mr-1" /> Mass → Solution
          </TabsTrigger>
          <TabsTrigger value="percent" className="text-xs sm:text-sm">
            <Calculator className="h-3 w-3 mr-1" /> % Dilution
          </TabsTrigger>
        </TabsList>

        {/* ── C1V1=C2V2 Tab ─────────────────────────────────────────────── */}
        <TabsContent value="c1v1">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">{lang === "ar" ? "احسب:" : "Solve for:"}</h2>
              <div className="flex gap-2 flex-wrap">
                {(["C1", "V1", "C2", "V2"] as DilutionField[]).map(f => (
                  <button
                    key={f}
                    onClick={() => { setSolveFor(f); setDilResult(null); setDilSteps([]); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      solveFor === f
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-emerald-400"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(["C1", "V1", "C2", "V2"] as DilutionField[]).map(f => {
                const isConc = f.startsWith("C");
                const isSolving = f === solveFor;
                return (
                  <div key={f} className={`space-y-1 p-3 rounded-lg border ${isSolving ? "bg-emerald-50 border-emerald-300" : "border-gray-200"}`}>
                    <Label className="text-xs font-semibold text-gray-600">
                      {f === "C1" ? (lang === "ar" ? "تركيز المخزون (C₁)" : "Stock Concentration (C₁)") : f === "V1" ? (lang === "ar" ? "حجم المخزون (V₁)" : "Stock Volume (V₁)") : f === "C2" ? (lang === "ar" ? "التركيز النهائي (C₂)" : "Final Concentration (C₂)") : (lang === "ar" ? "الحجم النهائي (V₂)" : "Final Volume (V₂)")}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={isSolving ? "?" : (lang === "ar" ? "أدخل القيمة" : "Enter value")}
                        value={isSolving ? "" : fields[f]}
                        disabled={isSolving}
                        onChange={e => setFields(prev => ({ ...prev, [f]: e.target.value }))}
                        className="flex-1 text-sm"
                      />
                      <Select value={units[f]} onValueChange={v => setUnits(prev => ({ ...prev, [f]: v }))}>
                        <SelectTrigger className="w-20 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(isConc ? CONC_UNITS : VOL_UNITS).map(u => (
                            <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button onClick={solveDilution} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <Calculator className="h-4 w-4 mr-2" /> {lang === "ar" ? `احسب ${solveFor}` : `Calculate ${solveFor}`}
              </Button>
              <Button variant="outline" onClick={resetDilution} size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {dilResult && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">{solveFor} = {dilResult}</span>
                </div>
                <div className="space-y-1">
                  {dilSteps.map((s, i) => (
                    <p key={i} className="text-xs text-gray-600 font-mono">{s}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Mass → Solution Tab ───────────────────────────────────────── */}
        <TabsContent value="mass">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-sm text-gray-500">{lang === "ar" ? "احسب حجم المذيب اللازم لإذابة كتلة معروفة للوصول إلى تركيز مستهدف." : "Calculate the volume of solvent needed to dissolve a known mass to a target concentration."}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-600">{lang === "ar" ? "كتلة المذاب" : "Mass of solute"}</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="e.g. 50" value={mass} onChange={e => setMass(e.target.value)} className="flex-1 text-sm" />
                  <Select value={massUnit} onValueChange={setMassUnit}>
                    <SelectTrigger className="w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["g", "mg", "µg"].map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-600">{lang === "ar" ? "الوزن الجزيئي (g/mol)" : "Molecular Weight (g/mol)"}</Label>
                <Input type="number" placeholder="e.g. 342.30" value={mw} onChange={e => setMw(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs font-semibold text-gray-600">{lang === "ar" ? "التركيز المستهدف" : "Target Concentration"}</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="e.g. 10" value={targetConc} onChange={e => setTargetConc(e.target.value)} className="flex-1 text-sm" />
                  <Select value={targetConcUnit} onValueChange={setTargetConcUnit}>
                    <SelectTrigger className="w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["M", "mM", "µM", "nM"].map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button onClick={solveMass} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Calculator className="h-4 w-4 mr-2" /> {lang === "ar" ? "احسب الحجم" : "Calculate Volume"}
            </Button>

            {massResult && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">{lang === "ar" ? `أضف مذيباً للوصول إلى: ${massResult.volume}` : `Add solvent to reach: ${massResult.volume}`}</span>
                </div>
                <div className="space-y-1">
                  {massResult.steps.map((s, i) => (
                    <p key={i} className="text-xs text-gray-600 font-mono">{s}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Percent Dilution Tab ──────────────────────────────────────── */}
        <TabsContent value="percent">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-sm text-gray-500">{lang === "ar" ? "احسب كمية المحلول الأصلي والمذيب اللازمة لتخفيف نسبي." : "Calculate how much stock solution and solvent to mix for a percent dilution."}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-600">{lang === "ar" ? "تركيز المخزون (%)" : "Stock Concentration (%)"}</Label>
                <Input type="number" placeholder="e.g. 70" value={stockPercent} onChange={e => setStockPercent(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-600">{lang === "ar" ? "التركيز المستهدف (%)" : "Target Concentration (%)"}</Label>
                <Input type="number" placeholder="e.g. 30" value={targetPercent} onChange={e => setTargetPercent(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs font-semibold text-gray-600">{lang === "ar" ? "الحجم النهائي" : "Final Volume"}</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="e.g. 100" value={finalVolume} onChange={e => setFinalVolume(e.target.value)} className="flex-1 text-sm" />
                  <Select value={finalVolUnit} onValueChange={setFinalVolUnit}>
                    <SelectTrigger className="w-20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["L", "mL", "µL"].map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button onClick={solvePercent} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Calculator className="h-4 w-4 mr-2" /> {lang === "ar" ? "احسب" : "Calculate"}
            </Button>

            {percentResult && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">
                    {lang === "ar"
                      ? `اخلط ${percentResult.stockVol} ${finalVolUnit} محلول + ${percentResult.waterVol} ${finalVolUnit} مذيب`
                      : `Mix ${percentResult.stockVol} ${finalVolUnit} stock + ${percentResult.waterVol} ${finalVolUnit} solvent`}
                  </span>
                </div>
                <div className="space-y-1">
                  {percentResult.steps.map((s, i) => (
                    <p key={i} className="text-xs text-gray-600 font-mono">{s}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
