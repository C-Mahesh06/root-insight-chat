import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MessageSquare, Trash2, LogOut, Shield, Send, Loader2,
  Leaf, Sparkles, User as UserIcon, Bot,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  loadThreads, createThread, deleteThread, updateThread, type Thread, type ChatMessage,
} from "@/lib/threads";
import { chatRag } from "@/lib/rag.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "PlantMD Chat" },
      { name: "description", content: "Chat with PlantMD to diagnose plant diseases." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const STARTERS = [
  { icon: Leaf, text: "Why are my tomato leaves turning yellow?" },
  { icon: Sparkles, text: "What's the best treatment for powdery mildew?" },
  { icon: Bot, text: "Identify pests damaging my pepper plants" },
  { icon: MessageSquare, text: "How do I prevent root rot in seedlings?" },
];

function Dashboard() {
  const { user, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const t = loadThreads(user.id);
    setThreads(t);
    setActiveId(t[0]?.id ?? null);
  }, [user]);

  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, sending]);

  function handleNew() {
    if (!user) return;
    const t = createThread(user.id);
    setThreads(loadThreads(user.id));
    setActiveId(t.id);
  }

  function handleDelete(id: string) {
    if (!user) return;
    deleteThread(user.id, id);
    const remaining = loadThreads(user.id);
    setThreads(remaining);
    if (activeId === id) setActiveId(remaining[0]?.id ?? null);
  }

  async function handleSend(text?: string) {
    if (!user) return;
    const content = (text ?? input).trim();
    if (!content || sending) return;

    let thread = active;
    if (!thread) {
      thread = createThread(user.id);
      setActiveId(thread.id);
    }

    const userMsg: ChatMessage = { role: "user", content, createdAt: Date.now() };
    const nextMessages = [...thread.messages, userMsg];
    const title = thread.title === "New chat" ? content.slice(0, 60) : thread.title;
    updateThread(user.id, thread.id, { messages: nextMessages, title });
    setThreads(loadThreads(user.id));
    setInput("");
    setSending(true);

    try {
      const { reply } = await chatRag({
        data: {
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        },
      });
      const assistantMsg: ChatMessage = { role: "assistant", content: reply, createdAt: Date.now() };
      updateThread(user.id, thread.id, { messages: [...nextMessages, assistantMsg] });
      setThreads(loadThreads(user.id));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to get response";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const initials = (profile?.full_name ?? user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-background leaf-bg">
      {/* Sidebar */}
      <aside className="hidden w-72 flex-col border-r border-border/60 bg-sidebar/40 backdrop-blur-xl md:flex">
        <div className="p-4">
          <Link to="/"><Wordmark /></Link>
        </div>
        <div className="px-3">
          <Button onClick={handleNew} className="w-full justify-start gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2 py-3">
          <div className="space-y-1">
            {threads.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">No conversations yet.</p>
            )}
            {threads.map((t) => (
              <div
                key={t.id}
                className={`group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                  activeId === t.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setActiveId(t.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                  className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="border-t border-border/60 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/15 text-xs text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{profile?.full_name ?? user?.email}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {isAdmin ? "Admin" : "Grower"}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                  <Shield className="mr-2 h-4 w-4" /> Admin panel
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/60 bg-background/50 px-4 py-3 backdrop-blur md:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold">
              {active?.title ?? "PlantMD"}
            </h1>
          </div>
          <ThemeToggle />
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-10">
          <div className="mx-auto max-w-3xl">
            {!active || active.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary shadow-glow">
                  <Leaf className="h-8 w-8" />
                </div>
                <h2 className="mt-5 font-display text-3xl font-semibold">How can I help your plants?</h2>
                <p className="mt-2 text-muted-foreground">Describe symptoms or ask about disease, pests, or treatment.</p>
                <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => handleSend(s.text)}
                      className="glass flex items-start gap-3 rounded-2xl p-4 text-left text-sm transition-all hover:-translate-y-0.5 hover:shadow-soft"
                    >
                      <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence initial={false}>
                  {active.messages.map((m, i) => (
                    <MessageBubble key={i} message={m} initials={initials} />
                  ))}
                </AnimatePresence>
                {sending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> PlantMD is thinking…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border/60 bg-background/50 px-4 py-4 backdrop-blur md:px-10">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <div className="glass flex flex-1 items-end gap-2 rounded-3xl p-2 pl-4">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about your plants…"
                rows={1}
                className="min-h-[40px] max-h-40 flex-1 resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
                disabled={sending}
              />
              <Button
                size="icon"
                onClick={() => handleSend()}
                disabled={!input.trim() || sending}
                className="h-10 w-10 shrink-0 rounded-2xl"
                aria-label="Send"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
            Answers are AI-generated. For high-value crops, confirm with your local extension office.
          </p>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ message, initials }: { message: ChatMessage; initials: string }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground text-xs" : "bg-primary/15 text-primary"}>
          {isUser ? initials : <Leaf className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`min-w-0 max-w-[85%] rounded-3xl px-4 py-3 text-sm ${
        isUser
          ? "rounded-tr-md bg-primary text-primary-foreground"
          : "rounded-tl-md bg-card shadow-soft"
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:my-3 prose-ul:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
