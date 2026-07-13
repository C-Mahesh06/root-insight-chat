"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, Trash2, LogOut, Shield, Send, Loader2, Leaf, Sparkles, Bot } from "lucide-react";
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
    sendMessage,
    loadConversations,
    loadConversation,
    startNewChat,
    deleteConversation,
  } = useChat();

  const [isAdmin, setIsAdmin] = useState(false);
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
      // Fetch user role from public schema
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
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const userInitials = user.email ? user.email.slice(0, 2).toUpperCase() : "US";

  return (
    <div className="flex h-screen bg-[var(--color-background)] leaf-bg overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={loadConversation}
        onNew={startNewChat}
        onDelete={deleteConversation}
      />

      <main className="flex min-w-0 flex-1 flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[var(--color-border)]/60 bg-[var(--color-background)]/50 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Wordmark />
            </div>
            <h1 className="hidden md:block truncate font-display text-lg font-semibold">
              {conversations.find((c) => c.id === conversationId)?.title || "PlantMD Chat"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => router.push("/admin")}
                className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-muted)]"
              >
                <Shield className="h-3.5 w-3.5" /> Admin Panel
              </button>
            )}
            <ThemeToggle />
            <button
              onClick={signOut}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-destructive)]"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Message Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-10">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-glow animate-pulse">
                  <Leaf className="h-8 w-8" />
                </div>
                <h2 className="mt-5 font-display text-3xl font-semibold">
                  PlantMD Diagnostic Portal
                </h2>
                <p className="mt-2 text-[var(--color-muted-foreground)] max-w-md">
                  Choose a crop and select the symptoms you are seeing to get an instant AI-powered diagnosis.
                </p>

                {/* Wizard Card */}
                <div className="mt-8 w-full max-w-xl p-6 border border-[var(--color-border)]/65 bg-[var(--color-card)]/90 backdrop-blur-md rounded-2xl shadow-soft">
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)] text-left mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                    Guided Diagnostic Wizard
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Crop Selection */}
                    <div className="text-left">
                      <label className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5">
                        Select Plant/Crop
                      </label>
                      <select
                        value={selectedCrop}
                        onChange={(e) => setSelectedCrop(e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-all cursor-pointer"
                      >
                        <option value="">-- Choose Crop --</option>
                        {CROPS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Symptom Selection */}
                    <div className="text-left">
                      <label className="block text-xs font-semibold text-[var(--color-muted-foreground)] mb-1.5">
                        Select Symptom
                      </label>
                      <select
                        value={selectedSymptom}
                        onChange={(e) => setSelectedSymptom(e.target.value)}
                        className="w-full h-11 px-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 transition-all cursor-pointer"
                      >
                        <option value="">-- Choose Symptom --</option>
                        {SYMPTOMS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleDiagnose}
                    disabled={!selectedCrop || !selectedSymptom || isStreaming}
                    className="mt-6 w-full h-11 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-muted)] disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm shadow-soft hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Bot className="h-4 w-4" />
                    Diagnose Plant
                  </button>
                </div>

                {/* Quick Starters Section */}
                <div className="mt-12 w-full max-w-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-[var(--color-border)]/50"></div>
                    <span className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider">
                      Or Try Quick Starters
                    </span>
                    <div className="h-px flex-1 bg-[var(--color-border)]/50"></div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => sendMessage(s.text)}
                        className="group glass flex items-start gap-3 rounded-2xl p-4 text-left text-sm border border-[var(--color-border)]/50 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
                      >
                        <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)] transition-transform duration-300 group-hover:scale-110" />
                        <span className="text-[var(--color-foreground)]/90 font-medium group-hover:text-[var(--color-foreground)] transition-colors duration-200">
                          {s.text}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <ChatMessage key={m.id} message={m} userInitials={userInitials} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </main>
    </div>
  );
}
