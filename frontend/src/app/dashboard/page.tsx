"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Shield, Loader2, Leaf, Sparkles, Bot, Menu, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const STARTERS = [
  { icon: Leaf, text: "Why are my tomato leaves turning yellow?" },
  { icon: Sparkles, text: "What's the best treatment for powdery mildew?" },
  { icon: Bot, text: "Identify pests damaging my pepper plants" },
  { icon: MessageSquare, text: "How do I prevent root rot in seedlings?" },
];

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const {
    messages,
    conversationId,
    conversations,
    isStreaming,
    selectedModel,
    setSelectedModel,
    sendMessage,
    loadConversations,
    loadConversation,
    startNewChat,
    deleteConversation,
  } = useChat();

  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedCrop, setSelectedCrop] = useState("");
  const [selectedSymptom, setSelectedSymptom] = useState("");

  const CROPS = [
    { label: "🍅 Tomato", value: "Tomato" },
    { label: "🫑 Pepper", value: "Pepper" },
    { label: "🥔 Potato", value: "Potato" },
    { label: "🌾 Rice", value: "Rice" },
    { label: "☕ Coffee", value: "Coffee" },
    { label: "🥖 Wheat", value: "Wheat" },
    { label: "🍌 Banana", value: "Banana" },
    { label: "🍫 Cacao", value: "Cacao" },
    { label: "🍵 Tea", value: "Tea" },
    { label: "🍭 Sugarcane", value: "Sugarcane" },
    { label: "🌱 Soybean", value: "Soybean" },
    { label: "🥒 Cucumber", value: "Cucumber" },
    { label: "🌹 Rose", value: "Rose" },
    { label: "🍋 Citrus", value: "Citrus" },
    { label: "🌿 Houseplant", value: "Houseplant" },
  ];

  const SYMPTOMS = [
    { label: "💛 Yellowing leaves", value: "yellowing leaves" },
    { label: "🟫 Leaf spots/patches", value: "dark leaf spots or patches" },
    { label: "🥀 Wilting / collapse", value: "sudden wilting or collapse" },
    { label: "🕸️ Webbing & tiny pests", value: "webbing or crawling pests" },
    { label: "❄️ Powdery white dust", value: "powdery white coating on leaves" },
    { label: "🍎 Rot on fruit/blossoms", value: "rot on the fruit or blossom end" },
  ];

  const handleDiagnose = () => {
    if (!selectedCrop || !selectedSymptom) return;
    sendMessage(`Identify and provide a step-by-step diagnostic and organic treatment guide for ${selectedSymptom} on my ${selectedCrop} plants.`);
    setSelectedCrop("");
    setSelectedSymptom("");
  };

  // Check admin role
  useEffect(() => {
    if (user) {
      import("@/lib/supabase").then(({ supabase }) => {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data }) => {
            if (data) setIsAdmin(true);
          });
      });
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    } else if (user) {
      loadConversations();
    }
  }, [user, authLoading, router, loadConversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (authLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--color-background)]">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--color-primary)]" />
          <span className="text-[13px] font-medium text-[var(--color-muted-foreground)]">Loading...</span>
        </div>
      </div>
    );
  }

  const userInitials = user.email ? user.email.slice(0, 2).toUpperCase() : "US";
  const currentTitle = conversations.find((c) => c.id === conversationId)?.title;

  return (
    <div className="flex h-screen bg-[var(--color-background)] overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={loadConversation}
        onNew={startNewChat}
        onDelete={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={user.email}
      />

      <main className="relative flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="relative z-20 flex items-center justify-between border-b border-[var(--color-border)]/50 bg-[var(--color-background)]/80 backdrop-blur-xl px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)]/60 text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
            <div className="md:hidden"><Wordmark size="sm" /></div>
            <h1 className="hidden md:block truncate text-[14px] font-semibold text-[var(--color-foreground)]">
              {currentTitle || "PlantMD"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => router.push("/admin")}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-muted)] px-3 py-1.5 text-[11px] font-semibold transition-colors text-[var(--color-foreground)] cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5 text-[var(--color-primary)]" /> Admin
              </button>
            )}

            <div className="relative hidden md:block">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="h-9 px-3 bg-[var(--color-card)] hover:bg-[var(--color-muted)] border border-[var(--color-border)]/60 rounded-lg text-[12px] font-semibold text-[var(--color-foreground)] outline-none transition-all cursor-pointer appearance-none pr-8 select-custom"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 8px center",
                  backgroundSize: "14px",
                }}
              >
                <option value="my-own-model">✨ Aether AI (Custom)</option>
                <option value="chatgpt">💬 ChatGPT</option>
                <option value="gemini">♊ Gemini</option>
                <option value="llama">🦙 Llama</option>
              </select>
            </div>

            <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)]/60 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer" />
            <button
              onClick={signOut}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)]/60 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-destructive)] transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Message Area */}
        <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-[720px] h-full flex flex-col">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center gap-6 animate-fade-in py-8">
                {/* Brand */}
                <div className="flex flex-col items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-emerald-600 text-white shadow-glow animate-float">
                    <Leaf className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                    PlantMD
                  </h2>
                  <p className="max-w-sm text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">
                    Diagnose plant diseases, identify pests, and get treatment plans grounded in agricultural research.
                  </p>
                </div>

                {/* Input */}
                <div className="w-full max-w-lg flex flex-col gap-1.5">
                  <ChatInput
                    onSend={sendMessage}
                    disabled={isStreaming}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                  />
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-[var(--color-muted-foreground)]/60 px-2 text-center sm:text-left">
                    <span>✨ Select model directly inside the chat bar</span>
                    <span className="font-semibold text-[var(--color-primary)]/70">Dev by Mahesh</span>
                  </div>
                </div>

                {/* Guided Wizard */}
                <div className="w-full max-w-lg">
                  <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-card)] p-5 shadow-xs">
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-muted-foreground)] mb-4 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                      Guided Diagnostics
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-1.5">
                          Crop
                        </label>
                        <select
                          value={selectedCrop}
                          onChange={(e) => setSelectedCrop(e.target.value)}
                          className="w-full h-10 px-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[12px] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all cursor-pointer appearance-none"
                        >
                          <option value="">Choose crop...</option>
                          {CROPS.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-1.5">
                          Symptom
                        </label>
                        <select
                          value={selectedSymptom}
                          onChange={(e) => setSelectedSymptom(e.target.value)}
                          className="w-full h-10 px-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[12px] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all cursor-pointer appearance-none"
                        >
                          <option value="">Choose symptom...</option>
                          {SYMPTOMS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={handleDiagnose}
                      disabled={!selectedCrop || !selectedSymptom || isStreaming}
                      className="mt-4 w-full h-10 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Bot className="h-4 w-4" />
                      Diagnose
                    </button>
                  </div>
                </div>

                {/* Quick Starters */}
                <div className="w-full max-w-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-[var(--color-border)]/50" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--color-muted-foreground)]">
                      Quick starters
                    </span>
                    <div className="h-px flex-1 bg-[var(--color-border)]/50" />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => sendMessage(s.text)}
                        className="group flex items-start gap-2.5 rounded-xl border border-[var(--color-border)]/40 bg-[var(--color-card)] p-3.5 text-left transition-all duration-200 hover:border-[var(--color-primary)]/30 hover:shadow-xs hover:-translate-y-px cursor-pointer"
                      >
                        <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)] transition-transform group-hover:scale-110" />
                        <span className="text-[12px] font-medium leading-snug text-[var(--color-foreground)]">
                          {s.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 pb-4">
                {messages.map((m) => (
                  <ChatMessage key={m.id} message={m} userInitials={userInitials} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Input */}
        {messages.length > 0 && (
          <div className="relative z-10 border-t border-[var(--color-border)]/40 bg-[var(--color-background)]/80 backdrop-blur-xl px-4 py-3.5 md:px-8">
            <div className="mx-auto max-w-[720px]">
              <ChatInput
                onSend={sendMessage}
                disabled={isStreaming}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
              />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-1 mt-2 text-[10px] text-[var(--color-muted-foreground)]/60 px-1 text-center sm:text-left">
                <span>AI-generated answers. Verify with local extensions for production crops.</span>
                <span className="font-semibold text-[var(--color-primary)]/70 shrink-0">Dev by Mahesh</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
