import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Send, Bot, User, FlaskConical, CheckCircle2, AlertCircle,
  Loader2, Trash2, Camera, Upload, X, ScanLine, AlertTriangle
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: "add" | "delete" | "unknown";
  chemicals?: Array<{
    name: string;
    formula: string | null;
    molecularWeight: string | null;
    hazardLevel: string;
    category: string | null;
    ghsCodes: string | null;
    storageConditions: string | null;
  }>;
  deleted?: string[];
  notFound?: string[];
  success?: boolean;
  isPhotoResult?: boolean;
  photoData?: IdentifiedChemical;
};

type IdentifiedChemical = {
  name: string;
  formula: string;
  molecularWeight: string;
  category: string;
  hazardLevel: "Normal" | "Hazardous" | "High Hazard";
  ghsCodes: string;
  storageConditions: string;
  physicalState: "Powder/Solid" | "Liquid";
  notes: string;
  scientificUses: string;
  confidence: "high" | "medium" | "low";
  identificationNotes: string;
};

function HazardChip({ level }: { level: string }) {
  const cls =
    level === "Normal" ? "hazard-normal" :
    level === "Hazardous" ? "hazard-hazardous" : "hazard-high";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {level}
    </span>
  );
}

function ConfidenceBadge({ confidence, lang }: { confidence: string; lang: string }) {
  const colors = {
    high: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-red-100 text-red-700 border-red-200",
  };
  const labels: Record<string, Record<string, string>> = {
    en: { high: "High confidence", medium: "Medium confidence", low: "Low confidence" },
    ar: { high: "ثقة عالية", medium: "ثقة متوسطة", low: "ثقة منخفضة" },
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[confidence as keyof typeof colors] || colors.low}`}>
      {labels[lang]?.[confidence] || confidence}
    </span>
  );
}

export default function ChatAdd() {
  const { t, isRTL, lang } = useLanguage();

  const WELCOME: Message = {
    id: "welcome",
    role: "assistant",
    content: lang === "ar"
      ? `مرحباً! أنا مساعدك لإدارة مخزون المواد الكيميائية.\n\nيمكنك:\n- **إضافة مادة:** اكتب اسمها مثل "Ethanol" أو "أضف حمض الكبريتيك"\n- **حذف مادة:** اكتب "احذف Sucrose" أو "delete HCl"\n- **مسح صورة:** التقط صورة للعبوة أو الملصق وسأتعرف على المادة تلقائياً`
      : `Hello! I'm your lab inventory assistant.\n\nYou can:\n- **Add a chemical:** type its name like "Ethanol" or "add sulfuric acid"\n- **Delete a chemical:** type "delete Sucrose" or "احذف HCl"\n- **Scan a package:** take a photo of the bottle or label and I'll identify it automatically`,
  };

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Camera / photo state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<"camera" | "upload">("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedMime, setCapturedMime] = useState("image/jpeg");
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [pendingChemical, setPendingChemical] = useState<IdentifiedChemical | null>(null);
  const [isAddingFromPhoto, setIsAddingFromPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aiChat = trpc.chemicals.aiChat.useMutation({
    onSuccess: (data) => {
      const msg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: data.message,
        intent: data.intent,
        chemicals: data.chemicals as any,
        deleted: data.deleted,
        notFound: data.notFound,
        success: data.success,
      };
      setMessages(prev => [...prev, msg]);
      utils.chemicals.list.invalidate();
      if (data.intent === "add" && data.success) {
        toast.success(lang === "ar" ? `تمت إضافة ${data.chemicals.length} مادة` : `Added ${data.chemicals.length} chemical(s)`);
      } else if (data.intent === "delete" && data.success) {
        toast.success(lang === "ar" ? `تم الحذف: ${data.deleted.join(", ")}` : `Deleted: ${data.deleted.join(", ")}`);
      }
    },
    onError: () => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: lang === "ar" ? "حدث خطأ. يرجى المحاولة مجدداً." : "Sorry, something went wrong. Please try again.",
        success: false,
      }]);
    },
  });

  const identifyMutation = trpc.identifyChemical.fromPhoto.useMutation();
  const addChemicalMutation = trpc.chemicals.add.useMutation();

  const send = () => {
    const text = input.trim();
    if (!text || aiChat.isPending) return;
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    aiChat.mutate({ message: text });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiChat.isPending]);

  // Camera functions
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error(lang === "ar" ? "تعذر الوصول إلى الكاميرا" : "Could not access camera");
      setCameraMode("upload");
    }
  }, [lang]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (showCamera && cameraMode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCamera, cameraMode, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(dataUrl);
    setCapturedMime("image/jpeg");
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
      setCapturedMime(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  };

  const identifyChemical = async () => {
    if (!capturedImage) return;
    setIsIdentifying(true);
    try {
      const base64 = capturedImage.split(",")[1];
      const result = await identifyMutation.mutateAsync({ imageBase64: base64, mimeType: capturedMime });
      if (result.success && result.data) {
        setPendingChemical(result.data as IdentifiedChemical);
        const msg: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: lang === "ar"
            ? `تم التعرف على المادة: **${result.data.name}**\n\nتحقق من البيانات أدناه وأكد الإضافة إلى المخزون.`
            : `Identified: **${result.data.name}**\n\nReview the data below and confirm to add to inventory.`,
          isPhotoResult: true,
          photoData: result.data as IdentifiedChemical,
        };
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString() + "-user", role: "user", content: lang === "ar" ? "📷 مسح صورة العبوة" : "📷 Scan package photo" },
          msg,
        ]);
        setShowCamera(false);
        setCapturedImage(null);
      } else {
        toast.error(lang === "ar" ? "تعذر التعرف على المادة. تأكد من وضوح الصورة." : "Could not identify the chemical. Please ensure the image is clear.");
      }
    } catch {
      toast.error(lang === "ar" ? "حدث خطأ أثناء التعرف على المادة." : "Error identifying chemical.");
    } finally {
      setIsIdentifying(false);
    }
  };

  const confirmAddFromPhoto = async (chem: IdentifiedChemical) => {
    setIsAddingFromPhoto(true);
    try {
      await addChemicalMutation.mutateAsync({
        name: chem.name,
        formula: chem.formula || undefined,
        molecularWeight: chem.molecularWeight || undefined,
        category: chem.category || undefined,
        hazardLevel: chem.hazardLevel,
        ghsCodes: chem.ghsCodes || undefined,
        storageConditions: chem.storageConditions || undefined,
        physicalState: chem.physicalState,
        notes: chem.notes || undefined,
      });
      utils.chemicals.list.invalidate();
      toast.success(lang === "ar" ? `تمت إضافة ${chem.name} إلى المخزون` : `${chem.name} added to inventory`);
      setPendingChemical(null);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: lang === "ar" ? `✅ تمت إضافة **${chem.name}** إلى المخزون بنجاح!` : `✅ **${chem.name}** has been added to inventory!`,
        success: true,
      }]);
    } catch {
      toast.error(lang === "ar" ? "فشل في إضافة المادة" : "Failed to add chemical");
    } finally {
      setIsAddingFromPhoto(false);
    }
  };

  return (
    <div className={`flex flex-col h-full gap-4 ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={isRTL ? "text-right" : ""}>
        <h1 className={`text-2xl font-bold text-foreground flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Bot className="w-6 h-6 text-primary" />
          {t("aiChatTitle")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("aiChatSubtitle")}</p>
      </div>

      {/* Camera Panel */}
      {showCamera && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-col gap-3">
          <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <ScanLine className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800 text-sm">
                {lang === "ar" ? "مسح عبوة المادة الكيميائية" : "Scan Chemical Package"}
              </span>
            </div>
            <button onClick={() => { setShowCamera(false); setCapturedImage(null); stopCamera(); }} className="text-blue-400 hover:text-blue-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode tabs */}
          <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              onClick={() => { setCameraMode("camera"); setCapturedImage(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${cameraMode === "camera" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50"}`}
            >
              <Camera className="w-3.5 h-3.5" />
              {lang === "ar" ? "كاميرا" : "Camera"}
            </button>
            <button
              onClick={() => { setCameraMode("upload"); setCapturedImage(null); stopCamera(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${cameraMode === "upload" ? "bg-blue-600 text-white" : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-50"}`}
            >
              <Upload className="w-3.5 h-3.5" />
              {lang === "ar" ? "رفع صورة" : "Upload Photo"}
            </button>
          </div>

          {!capturedImage ? (
            <>
              {cameraMode === "camera" ? (
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-56">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <button
                    onClick={capturePhoto}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-blue-700 font-semibold text-xs px-5 py-2 rounded-full shadow-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    {lang === "ar" ? "التقاط" : "Capture"}
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-100/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-blue-600 font-medium">
                    {lang === "ar" ? "انقر لرفع صورة" : "Click to upload a photo"}
                  </p>
                  <p className="text-xs text-blue-400 mt-1">JPG, PNG, WEBP</p>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="relative rounded-lg overflow-hidden max-h-48">
                <img src={capturedImage} alt="captured" className="w-full object-contain max-h-48 bg-black" />
                <button
                  onClick={() => { setCapturedImage(null); if (cameraMode === "camera") startCamera(); }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <Button
                onClick={identifyChemical}
                disabled={isIdentifying}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isIdentifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                {isIdentifying
                  ? (lang === "ar" ? "جارٍ التعرف على المادة..." : "Identifying chemical...")
                  : (lang === "ar" ? "تعرف على المادة بالذكاء الاصطناعي" : "Identify with AI")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4 flex flex-col gap-4 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? (isRTL ? "flex-row" : "flex-row-reverse") : (isRTL ? "flex-row-reverse" : "flex-row")}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[80%] flex flex-col gap-2 ${msg.role === "user" ? (isRTL ? "items-start" : "items-end") : (isRTL ? "items-end" : "items-start")}`}>
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}>
                {msg.content.split("\n").map((line, i) => (
                  <p key={i} className={i > 0 ? "mt-1" : ""}>
                    {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                      part.startsWith("**") && part.endsWith("**")
                        ? <strong key={j}>{part.slice(2, -2)}</strong>
                        : part
                    )}
                  </p>
                ))}
              </div>

              {/* Photo identification result card */}
              {msg.isPhotoResult && msg.photoData && (
                <div className="border border-blue-200 rounded-xl p-4 bg-white shadow-sm w-full max-w-sm">
                  <div className={`flex items-center justify-between mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <FlaskConical className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-sm">{msg.photoData.name}</span>
                    </div>
                    <ConfidenceBadge confidence={msg.photoData.confidence} lang={lang} />
                  </div>

                  {msg.photoData.confidence === "low" && (
                    <div className={`flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {lang === "ar" ? "تعرف غير مؤكد — تحقق من البيانات قبل الإضافة" : "Low confidence — verify data before adding"}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                    <span><b className="text-foreground">{lang === "ar" ? "الصيغة:" : "Formula:"}</b> {msg.photoData.formula || "—"}</span>
                    <span><b className="text-foreground">{lang === "ar" ? "الوزن الجزيئي:" : "Mol. Wt.:"}</b> {msg.photoData.molecularWeight || "—"}</span>
                    <span><b className="text-foreground">{lang === "ar" ? "الفئة:" : "Category:"}</b> {msg.photoData.category || "—"}</span>
                    <span><b className="text-foreground">{lang === "ar" ? "الحالة:" : "State:"}</b> {msg.photoData.physicalState || "—"}</span>
                    <span className="col-span-2"><b className="text-foreground">{lang === "ar" ? "التخزين:" : "Storage:"}</b> {msg.photoData.storageConditions || "—"}</span>
                  </div>

                  <div className={`flex items-center gap-2 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <HazardChip level={msg.photoData.hazardLevel} />
                    <span className="text-xs text-muted-foreground">{msg.photoData.ghsCodes || "None"}</span>
                  </div>

                  {msg.photoData.identificationNotes && (
                    <p className="text-xs text-muted-foreground italic mb-3">{msg.photoData.identificationNotes}</p>
                  )}

                  <Button
                    onClick={() => confirmAddFromPhoto(msg.photoData!)}
                    disabled={isAddingFromPhoto}
                    size="sm"
                    className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {isAddingFromPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {lang === "ar" ? "إضافة إلى المخزون" : "Add to Inventory"}
                  </Button>
                </div>
              )}

              {/* Added chemical cards */}
              {msg.intent === "add" && msg.chemicals && msg.chemicals.length > 0 && (
                <div className="flex flex-col gap-2 w-full">
                  {msg.chemicals.map((chem, i) => (
                    <div key={i} className="border border-green-200 rounded-lg p-3 bg-green-50/60 text-xs">
                      <div className={`flex items-center justify-between mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <FlaskConical className="w-3.5 h-3.5 text-green-600" />
                          <span className="font-semibold text-sm">{chem.name}</span>
                        </div>
                        <HazardChip level={chem.hazardLevel} />
                      </div>
                      <div className={`grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground ${isRTL ? "text-right" : ""}`}>
                        <span><b className="text-foreground">{lang === "ar" ? "الصيغة:" : "Formula:"}</b> {chem.formula || "—"}</span>
                        <span><b className="text-foreground">{lang === "ar" ? "الوزن:" : "Mol. Wt.:"}</b> {chem.molecularWeight || "—"} g/mol</span>
                        <span><b className="text-foreground">{lang === "ar" ? "الفئة:" : "Category:"}</b> {chem.category || "—"}</span>
                        <span><b className="text-foreground">GHS:</b> {chem.ghsCodes || "None"}</span>
                        <span className="col-span-2"><b className="text-foreground">{lang === "ar" ? "التخزين:" : "Storage:"}</b> {chem.storageConditions || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Deleted chemicals list */}
              {msg.intent === "delete" && msg.deleted && msg.deleted.length > 0 && (
                <div className="flex flex-col gap-1 w-full">
                  {msg.deleted.map((name, i) => (
                    <div key={i} className={`border border-red-200 rounded-lg px-3 py-2 bg-red-50/60 text-xs flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="font-medium text-red-700">{name}</span>
                      <span className="text-red-400 ml-auto">{lang === "ar" ? "تم الحذف" : "Removed"}</span>
                    </div>
                  ))}
                  {msg.notFound && msg.notFound.length > 0 && (
                    <div className={`border border-orange-200 rounded-lg px-3 py-2 bg-orange-50/60 text-xs text-orange-700 ${isRTL ? "text-right" : ""}`}>
                      {lang === "ar" ? "غير موجود: " : "Not found: "}{msg.notFound.join(", ")}
                    </div>
                  )}
                </div>
              )}

              {/* Status icon */}
              {msg.role === "assistant" && msg.success !== undefined && !msg.isPhotoResult && (
                <div className={`flex items-center gap-1 text-xs ${msg.success ? "text-green-600" : "text-destructive"} ${isRTL ? "flex-row-reverse" : ""}`}>
                  {msg.intent === "delete" && msg.success
                    ? <><Trash2 className="w-3.5 h-3.5" /> {lang === "ar" ? "تم الحذف من المخزون" : "Deleted from inventory"}</>
                    : msg.intent === "add" && msg.success
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> {lang === "ar" ? "تمت الإضافة إلى المخزون" : "Added to inventory"}</>
                    : msg.success === false
                    ? <><AlertCircle className="w-3.5 h-3.5" /> {msg.notFound?.length ? (lang === "ar" ? "بعض المواد غير موجودة" : "Some chemicals not found") : t("error")}</>
                    : null
                  }
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {(aiChat.isPending || isIdentifying) && (
          <div className={`flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {lang === "ar" ? "جارٍ المعالجة..." : "Processing your request..."}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        {/* Scan button */}
        <Button
          variant="outline"
          onClick={() => { setShowCamera(!showCamera); setCapturedImage(null); }}
          className={`gap-2 shrink-0 ${showCamera ? "bg-blue-50 border-blue-300 text-blue-700" : ""}`}
          title={lang === "ar" ? "مسح صورة العبوة" : "Scan package photo"}
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">{lang === "ar" ? "مسح" : "Scan"}</span>
        </Button>

        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t("aiChatPlaceholder")}
          disabled={aiChat.isPending}
          className={`flex-1 ${isRTL ? "text-right" : ""}`}
          dir={isRTL ? "rtl" : "ltr"}
        />
        <Button onClick={send} disabled={!input.trim() || aiChat.isPending} className="gap-2 px-5 shrink-0">
          {aiChat.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t("send")}
        </Button>
      </div>
    </div>
  );
}
