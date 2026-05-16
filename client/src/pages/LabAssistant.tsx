import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Streamdown } from "streamdown";
import {
  Send, Bot, User, FlaskConical, Loader2, BookOpen,
  Lightbulb, Bookmark, BookmarkCheck, Trash2, Search,
  ChevronRight, X
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const EXAMPLE_QUERIES = [
  "How do I measure sulfate content using BaCl₂?",
  "What is the DPPH antioxidant assay protocol?",
  "Compare DPPH vs ABTS antioxidant assays",
  "How to prepare a phosphate buffer at pH 7.4?",
  "What method can I use to measure total protein?",
  "كيف أقيس محتوى الكربوهيدرات في العينة النباتية؟",
  "ما هي طريقة فولين-سيوكالتو لقياس الفينولات الكلية؟",
  "قارن بين طريقة Bradford و Lowry لقياس البروتين",
];

export default function LabAssistant() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { t, isRTL, lang } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [pubchemQuery, setPubchemQuery] = useState("");
  const [pubchemLoading, setPubchemLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.labAssistant.chat.useMutation();
  const saveProtocolMutation = trpc.protocols.save.useMutation();
  const deleteProtocolMutation = trpc.protocols.delete.useMutation();
  const { data: savedProtocols, refetch: refetchProtocols } = trpc.protocols.list.useQuery();
  const pubchemMutation = trpc.labAssistant.pubchem.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    try {
      const result = await chatMutation.mutateAsync({ messages: newMessages });
      setMessages([...newMessages, { role: "assistant", content: result.reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const saveProtocol = async (msgIdx: number) => {
    if (!isAdmin) { toast.error("Only admin can save protocols"); return; }
    const assistantMsg = messages[msgIdx];
    const userMsg = messages[msgIdx - 1];
    if (!assistantMsg || assistantMsg.role !== "assistant") return;
    setSavingIdx(msgIdx);
    try {
      const title = userMsg?.content?.slice(0, 80) || "Protocol";
      await saveProtocolMutation.mutateAsync({
        title,
        question: userMsg?.content || "",
        response: assistantMsg.content,
        tags: "",
      });
      await refetchProtocols();
      toast.success("Protocol saved!");
    } catch {
      toast.error("Failed to save protocol");
    } finally {
      setSavingIdx(null);
    }
  };

  const deleteProtocol = async (id: number) => {
    if (!isAdmin) return;
    try {
      await deleteProtocolMutation.mutateAsync({ id });
      await refetchProtocols();
      toast.success("Protocol deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const lookupPubchem = async () => {
    if (!pubchemQuery.trim()) return;
    setPubchemLoading(true);
    try {
      const result = await pubchemMutation.mutateAsync({ name: pubchemQuery.trim() });
      const msg = result.found
        ? `**PubChem Data — ${result.name}**\n\n| Property | Value |\n|---|---|\n| **Formula** | ${result.formula || "—"} |\n| **Molecular Weight** | ${result.molecularWeight || "—"} g/mol |\n| **CAS Number** | ${result.casNumber || "—"} |\n| **IUPAC Name** | ${result.iupacName || "—"} |\n| **Melting Point** | ${result.meltingPoint || "—"} |\n| **Boiling Point** | ${result.boilingPoint || "—"} |\n| **Solubility** | ${result.solubility || "—"} |\n| **PubChem CID** | [${result.cid}](https://pubchem.ncbi.nlm.nih.gov/compound/${result.cid}) |`
        : `No data found for "${pubchemQuery}" on PubChem.`;
      setMessages(prev => [
        ...prev,
        { role: "user", content: `PubChem lookup: ${pubchemQuery}` },
        { role: "assistant", content: msg },
      ]);
      setPubchemQuery("");
    } catch {
      toast.error("PubChem lookup failed");
    } finally {
      setPubchemLoading(false);
    }
  };

  return (
    <div className={`flex h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 py-4 gap-4 ${isRTL ? "flex-row-reverse" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <FlaskConical className="h-5 w-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{t("labAssistantTitle")}</h1>
            <p className="text-xs text-gray-500">{t("labAssistantSubtitle")}</p>
          </div>
          <div className="flex gap-2">
            {/* PubChem quick lookup */}
            <div className="flex gap-1">
              <Input
                value={pubchemQuery}
                onChange={e => setPubchemQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && lookupPubchem()}
                placeholder={lang === "ar" ? "بحث PubChem..." : "PubChem lookup..."}
                className="w-36 text-xs h-8"
                dir={isRTL ? "rtl" : "ltr"}
              />
              <Button size="sm" variant="outline" onClick={lookupPubchem} disabled={pubchemLoading} className="h-8 px-2">
                {pubchemLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </Button>
            </div>
            <Button
              size="sm"
              variant={showSaved ? "default" : "outline"}
              onClick={() => setShowSaved(!showSaved)}
              className="h-8 gap-1 text-xs"
            >
              <Bookmark className="h-3 w-3" />
              {lang === "ar" ? `محفوظ (${savedProtocols?.length || 0})` : `Saved (${savedProtocols?.length || 0})`}
            </Button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4 mb-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-6">
              <div className="p-4 rounded-full bg-blue-100 mb-3">
                <Bot className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">{lang === "ar" ? "مساعدك البحثي" : "Your Research Assistant"}</h2>
              <p className="text-sm text-gray-500 max-w-md mb-5">
                {lang === "ar"
                  ? "اسأل عن الطرق التحليلية والبروتوكولات والمراجع. سأتحقق من مخزون مختبرك وأخبرك بالمواد المتوفرة (✅) أو المطلوبة (❌)."
                  : "Ask about analytical methods, protocols, and references. I'll cross-check your lab inventory and tell you which chemicals you have (✅) or need (❌)."}
              </p>
              <div className="w-full max-w-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-gray-600">Try asking:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXAMPLE_QUERIES.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-400 text-gray-700 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mt-1">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                {/* Save button for assistant messages */}
                {msg.role === "assistant" && isAdmin && (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => saveProtocol(i)}
                      disabled={savingIdx === i}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {savingIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bookmark className="h-3 w-3" />}
                      {t("saveProtocol")}
                    </button>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mt-1">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching protocols and references...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("askProtocol")}
            className={`flex-1 resize-none min-h-[52px] max-h-32 bg-white border-gray-300 rounded-xl text-sm ${isRTL ? "text-right" : ""}`}
            rows={1}
            disabled={isLoading}
            dir={isRTL ? "rtl" : "ltr"}
          />
          <Button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
            className="h-[52px] w-[52px] rounded-xl bg-blue-600 hover:bg-blue-700 flex-shrink-0" size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-1">
          {lang === "ar"
            ? "تتضمن الردود مراجع علمية محكّمة وفحصاً للمخزون. تحقق دائماً من البروتوكولات قبل التطبيق."
            : "Responses include peer-reviewed references and inventory cross-check. Always verify protocols before use."}
        </p>
      </div>

      {/* Saved Protocols Panel */}
      {showSaved && (
        <div className="w-72 flex-shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-sm text-gray-800">{t("savedProtocolsTitle")}</span>
              <Badge variant="outline" className="text-xs">{savedProtocols?.length || 0}</Badge>
            </div>
            <button onClick={() => setShowSaved(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!savedProtocols?.length && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                {lang === "ar" ? "لا توجد بروتوكولات محفوظة بعد." : "No saved protocols yet."}<br />
                {lang === "ar" ? 'انقر على "حفظ البروتوكول" على أي رد من الذكاء الاصطناعي.' : 'Click "Save protocol" on any AI response.'}
              </div>
            )}
            {savedProtocols?.map(p => (
              <div key={p.id} className="rounded-lg border border-gray-200 p-3 hover:border-blue-300 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="text-left flex-1 min-w-0"
                    onClick={() => {
                      setMessages(prev => [
                        ...prev,
                        { role: "user", content: p.question },
                        { role: "assistant", content: p.response },
                      ]);
                      setShowSaved(false);
                    }}
                  >
                    <p className="text-xs font-medium text-gray-800 line-clamp-2">{p.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(p.createdAt).toLocaleDateString()}</p>
                  </button>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => {
                        setMessages(prev => [
                          ...prev,
                          { role: "user", content: p.question },
                          { role: "assistant", content: p.response },
                        ]);
                        setShowSaved(false);
                      }}
                      className="text-blue-500 hover:text-blue-700"
                      title="Load in chat"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => deleteProtocol(p.id)} className="text-red-400 hover:text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
