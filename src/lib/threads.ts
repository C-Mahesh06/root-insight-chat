// LocalStorage-backed chat threads.

export type ChatRole = "user" | "assistant";

export interface ChatSource {
  document_id: string;
  title: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  reaction?: "like" | "dislike";
  sources?: ChatSource[];
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const KEY = "plantmd-threads-v1";

function readAll(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatThread[];
  } catch {
    return [];
  }
}

function writeAll(threads: ChatThread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(threads));
  window.dispatchEvent(new CustomEvent("plantmd-threads-changed"));
}

export const threadStore = {
  list(): ChatThread[] {
    return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): ChatThread | undefined {
    return readAll().find((t) => t.id === id);
  },
  create(title = "New chat"): ChatThread {
    const now = Date.now();
    const t: ChatThread = {
      id: crypto.randomUUID(),
      title,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    const all = readAll();
    all.push(t);
    writeAll(all);
    return t;
  },
  update(id: string, patch: Partial<Omit<ChatThread, "id">>): ChatThread | undefined {
    const all = readAll();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() };
    writeAll(all);
    return all[idx];
  },
  rename(id: string, title: string) {
    return this.update(id, { title });
  },
  addMessage(id: string, msg: ChatMessage): ChatThread | undefined {
    const all = readAll();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    const messages = [...all[idx].messages, msg];
    // Auto-title from first user message
    const title =
      all[idx].title === "New chat" && msg.role === "user"
        ? msg.content.slice(0, 60)
        : all[idx].title;
    all[idx] = { ...all[idx], messages, title, updatedAt: Date.now() };
    writeAll(all);
    return all[idx];
  },
  replaceMessage(id: string, messageId: string, patch: Partial<ChatMessage>): ChatThread | undefined {
    const all = readAll();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    const messages = all[idx].messages.map((m) =>
      m.id === messageId ? { ...m, ...patch } : m,
    );
    all[idx] = { ...all[idx], messages, updatedAt: Date.now() };
    writeAll(all);
    return all[idx];
  },
  removeAfter(id: string, messageId: string): ChatThread | undefined {
    const all = readAll();
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    const mIdx = all[idx].messages.findIndex((m) => m.id === messageId);
    if (mIdx === -1) return all[idx];
    all[idx] = { ...all[idx], messages: all[idx].messages.slice(0, mIdx + 1), updatedAt: Date.now() };
    writeAll(all);
    return all[idx];
  },
  remove(id: string) {
    writeAll(readAll().filter((t) => t.id !== id));
  },
};
