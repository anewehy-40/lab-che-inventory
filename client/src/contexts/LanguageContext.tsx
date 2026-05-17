import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "ar";

export const translations = {
  en: {
    // App
    appTitle: "Lab Chemical Inventory",
    // Sidebar nav
    inventory: "Inventory",
    labAssistant: "Lab Assistant",
    dilutionCalculator: "Dilution Calculator",
    pubchemLookup: "PubChem Lookup",
    aiAddChemical: "AI Add Chemical",
    researchTools: "Research Tools",
    savedProtocols: "Saved Protocols",
    noSavedProtocols: "No saved protocols yet",
    signIn: "Sign In (Admin)",
    signOut: "Sign Out",
    admin: "Admin",
    // Dashboard landing
    home: "Home",
    dashboardSubtitle: "Centralized chemical inventory & laboratory tools",
    overview: "Overview",
    quickAccess: "Quick Access",
    statTotal: "Total Chemicals",
    statHazardous: "Hazardous",
    statSolids: "Powders & Solids",
    inventoryDesc: "Browse, search and manage all chemicals",
    labAssistantDesc: "AI protocols and peer-reviewed references",
    dilutionCalculatorDesc: "Concentration and dilution calculations",
    researchToolsDesc: "PubChem lookup and research utilities",
    aiAddChemicalDesc: "Add chemicals to the inventory with AI",
    safetyNote: "Always follow your institution's safety protocols and SDS guidance.",
    // Home page
    chemicalInventory: "Chemical Inventory",
    chemicalsShown: "chemicals shown",
    allChemicals: "All Chemicals",
    powdersSolids: "Powders & Solids",
    liquids: "Liquids",
    highHazard: "High Hazard",
    searchPlaceholder: "Search by name, formula, category, GHS code...",
    allHazardLevels: "All Hazard Levels",
    normal: "Normal",
    hazardous: "Hazardous",
    exportExcel: "Export Excel",
    importExcel: "Import Excel",
    importing: "Importing...",
    importedCount: "chemicals imported",
    importEmpty: "No valid chemicals found in the file",
    importFailed: "Import failed — check the file format",
    // Hazard legend
    normalLegend: "Normal — no significant hazard",
    hazardousLegend: "Hazardous — PPE required",
    highHazardLegend: "High Hazard — strict controls required",
    // Table headers
    colNumber: "#",
    colName: "Chemical Name",
    colFormula: "Formula",
    colMolWeight: "Mol. Wt.",
    colCategory: "Category",
    colHazard: "Hazard",
    colGHS: "GHS Codes",
    colStorage: "Storage",
    colNotes: "Notes",
    colActions: "Actions",
    // Table actions
    editChemical: "Edit chemical",
    deleteChemical: "Delete chemical",
    scientificUses: "Scientific Uses & Research Applications",
    noScientificUses: "No scientific uses recorded.",
    // Filters
    filterByHazard: "Filter by hazard",
    // Empty state
    noChemicalsFound: "No chemicals found",
    tryAdjusting: "Try adjusting your search or filter criteria.",
    // AI Chat
    aiChatTitle: "AI Chemical Assistant",
    aiChatSubtitle: "Type a chemical name to add it, or ask to delete one",
    aiChatPlaceholder: "e.g. \"Add ethanol\" or \"Delete sucrose\"",
    send: "Send",
    // Lab Assistant
    labAssistantTitle: "Lab Assistant",
    labAssistantSubtitle: "AI research assistant with protocol recommendations and peer-reviewed references",
    askProtocol: "Ask about a protocol, method, or experiment...",
    saveProtocol: "Save Protocol",
    savedProtocolsTitle: "Saved Protocols",
    deleteProtocol: "Delete",
    // Dilution Calculator
    dilutionCalcTitle: "Dilution Calculator",
    dilutionCalcSubtitle: "Scan a bottle label or enter values manually",
    scanLabel: "Scan Chemical Label",
    scanLabelHint: "Point camera at the bottle label",
    openCamera: "Open Camera",
    uploadPhoto: "Upload Photo",
    capture: "Capture",
    readLabelAI: "Read Label with AI",
    readingLabel: "Reading label...",
    extractedFromLabel: "Extracted from label:",
    applyToCalculator: "Apply to Calculator",
    scanAgain: "Scan Again",
    chemical: "Chemical:",
    conc: "Conc:",
    molarity: "Molarity:",
    density: "Density:",
    mw: "MW:",
    cas: "CAS:",
    purity: "Purity:",
    notes: "Notes:",
    solveFor: "Solve for:",
    calculate: "Calculate",
    calculateVolume: "Calculate Volume",
    massOfSolute: "Mass of solute",
    molecularWeight: "Molecular Weight (g/mol)",
    targetConcentration: "Target Concentration",
    stockConcentration: "Stock Concentration (%)",
    targetConcentrationPct: "Target Concentration (%)",
    finalVolume: "Final Volume",
    stockConc: "Stock Concentration (C₁)",
    stockVol: "Stock Volume (V₁)",
    finalConc: "Final Concentration (C₂)",
    finalVol: "Final Volume (V₂)",
    massToSolution: "Mass → Solution",
    percentDilution: "% Dilution",
    massToSolutionDesc: "Calculate the volume of solvent needed to dissolve a known mass to a target concentration.",
    percentDilutionDesc: "Calculate how much stock solution and solvent to mix for a percent dilution.",
    // PubChem
    pubchemTitle: "PubChem Lookup",
    pubchemSubtitle: "Search the PubChem database for chemical properties",
    searchChemical: "Search chemical name or CAS number...",
    search: "Search",
    searching: "Searching...",
    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    close: "Close",
    back: "Back",
    reset: "Reset",
  },
  ar: {
    // App
    appTitle: "مخزون المواد الكيميائية",
    // Sidebar nav
    inventory: "المخزون",
    labAssistant: "مساعد المختبر",
    dilutionCalculator: "حاسبة التخفيف",
    pubchemLookup: "بحث PubChem",
    aiAddChemical: "إضافة مادة بالذكاء الاصطناعي",
    researchTools: "أدوات البحث",
    savedProtocols: "البروتوكولات المحفوظة",
    noSavedProtocols: "لا توجد بروتوكولات محفوظة بعد",
    signIn: "تسجيل الدخول (المشرف)",
    signOut: "تسجيل الخروج",
    admin: "مشرف",
    // Dashboard landing
    home: "الرئيسية",
    dashboardSubtitle: "إدارة مركزية لمخزون المواد الكيميائية وأدوات المختبر",
    overview: "نظرة عامة",
    quickAccess: "وصول سريع",
    statTotal: "إجمالي المواد",
    statHazardous: "مواد خطرة",
    statSolids: "مساحيق وصلبيات",
    inventoryDesc: "تصفّح وابحث وأدِر جميع المواد الكيميائية",
    labAssistantDesc: "بروتوكولات بالذكاء الاصطناعي ومراجع علمية محكّمة",
    dilutionCalculatorDesc: "حسابات التركيز والتخفيف",
    researchToolsDesc: "بحث PubChem وأدوات بحثية",
    aiAddChemicalDesc: "أضف المواد الكيميائية إلى المخزون بالذكاء الاصطناعي",
    safetyNote: "التزم دائمًا ببروتوكولات السلامة وإرشادات صحيفة بيانات السلامة الخاصة بمؤسستك.",
    // Home page
    chemicalInventory: "مخزون المواد الكيميائية",
    chemicalsShown: "مادة معروضة",
    allChemicals: "جميع المواد",
    powdersSolids: "مساحيق وصلبيات",
    liquids: "سوائل",
    highHazard: "خطورة عالية",
    searchPlaceholder: "ابحث بالاسم أو الصيغة أو الفئة أو رمز GHS...",
    allHazardLevels: "جميع مستويات الخطورة",
    normal: "عادي",
    hazardous: "خطر",
    exportExcel: "تصدير Excel",
    importExcel: "استيراد Excel",
    importing: "جارٍ الاستيراد...",
    importedCount: "مادة تم استيرادها",
    importEmpty: "لم يتم العثور على مواد صالحة في الملف",
    importFailed: "فشل الاستيراد — تحقق من صيغة الملف",
    // Hazard legend
    normalLegend: "عادي — لا توجد مخاطر تذكر",
    hazardousLegend: "خطر — يلزم معدات الوقاية",
    highHazardLegend: "خطورة عالية — ضوابط صارمة مطلوبة",
    // Table headers
    colNumber: "#",
    colName: "اسم المادة",
    colFormula: "الصيغة",
    colMolWeight: "الوزن الجزيئي",
    colCategory: "الفئة",
    colHazard: "الخطورة",
    colGHS: "رموز GHS",
    colStorage: "التخزين",
    colNotes: "ملاحظات",
    colActions: "إجراءات",
    // Table actions
    editChemical: "تعديل المادة",
    deleteChemical: "حذف المادة",
    scientificUses: "الاستخدامات العلمية وتطبيقات البحث",
    noScientificUses: "لا توجد استخدامات علمية مسجلة.",
    // Filters
    filterByHazard: "تصفية حسب الخطورة",
    // Empty state
    noChemicalsFound: "لم يتم العثور على مواد",
    tryAdjusting: "حاول تعديل معايير البحث أو التصفية.",
    // AI Chat
    aiChatTitle: "مساعد المواد الكيميائية",
    aiChatSubtitle: "اكتب اسم مادة لإضافتها أو اطلب حذف مادة",
    aiChatPlaceholder: "مثال: \"أضف الإيثانول\" أو \"احذف السكروز\"",
    send: "إرسال",
    // Lab Assistant
    labAssistantTitle: "مساعد المختبر",
    labAssistantSubtitle: "مساعد بحثي بالذكاء الاصطناعي مع توصيات البروتوكولات والمراجع العلمية",
    askProtocol: "اسأل عن بروتوكول أو طريقة أو تجربة...",
    saveProtocol: "حفظ البروتوكول",
    savedProtocolsTitle: "البروتوكولات المحفوظة",
    deleteProtocol: "حذف",
    // Dilution Calculator
    dilutionCalcTitle: "حاسبة التخفيف",
    dilutionCalcSubtitle: "امسح ملصق الزجاجة أو أدخل القيم يدوياً",
    scanLabel: "مسح ملصق المادة الكيميائية",
    scanLabelHint: "وجّه الكاميرا نحو ملصق الزجاجة",
    openCamera: "فتح الكاميرا",
    uploadPhoto: "رفع صورة",
    capture: "التقاط",
    readLabelAI: "قراءة الملصق بالذكاء الاصطناعي",
    readingLabel: "جارٍ قراءة الملصق...",
    extractedFromLabel: "مستخرج من الملصق:",
    applyToCalculator: "تطبيق على الحاسبة",
    scanAgain: "مسح مجدداً",
    chemical: "المادة:",
    conc: "التركيز:",
    molarity: "المولارية:",
    density: "الكثافة:",
    mw: "الوزن الجزيئي:",
    cas: "رقم CAS:",
    purity: "النقاء:",
    notes: "ملاحظات:",
    solveFor: "احسب:",
    calculate: "احسب",
    calculateVolume: "احسب الحجم",
    massOfSolute: "كتلة المذاب",
    molecularWeight: "الوزن الجزيئي (غ/مول)",
    targetConcentration: "التركيز المطلوب",
    stockConcentration: "تركيز المخزون (%)",
    targetConcentrationPct: "التركيز المطلوب (%)",
    finalVolume: "الحجم النهائي",
    stockConc: "تركيز المخزون (C₁)",
    stockVol: "حجم المخزون (V₁)",
    finalConc: "التركيز النهائي (C₂)",
    finalVol: "الحجم النهائي (V₂)",
    massToSolution: "كتلة ← محلول",
    percentDilution: "تخفيف %",
    massToSolutionDesc: "احسب حجم المذيب اللازم لإذابة كتلة معلومة للوصول إلى تركيز مطلوب.",
    percentDilutionDesc: "احسب كميات محلول المخزون والمذيب اللازمة للتخفيف النسبي.",
    // PubChem
    pubchemTitle: "بحث PubChem",
    pubchemSubtitle: "ابحث في قاعدة بيانات PubChem عن خصائص المواد الكيميائية",
    searchChemical: "ابحث باسم المادة أو رقم CAS...",
    search: "بحث",
    searching: "جارٍ البحث...",
    // Common
    loading: "جارٍ التحميل...",
    error: "خطأ",
    success: "نجاح",
    cancel: "إلغاء",
    save: "حفظ",
    delete: "حذف",
    close: "إغلاق",
    back: "رجوع",
    reset: "إعادة تعيين",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

type LanguageContextType = {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem("lang") as Language) || "en";
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  const isRTL = lang === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  const t = (key: TranslationKey): string => {
    return translations[lang][key] ?? translations.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
