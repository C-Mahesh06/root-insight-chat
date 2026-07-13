"use client";

import { Plus, MessageSquare, Trash2 } from "lucide-react";
import type { Conversation } from "@/hooks/useChat";
import { Wordmark } from "./Logo";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ChatSidebarProps) {
  return (
    <aside className="hidden w-72 flex-col border-r border-[var(--color-border)]/60 bg-[var(--color-sidebar)]/40 backdrop-blur-xl md:flex">
      <div className="p-4">
        <Wordmark />
      </div>

      <div className="px-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-1.5">
          {conversations.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-[var(--color-muted-foreground)]">
              No conversations yet.
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200 border-l-2 ${
                activeId === c.id
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-foreground)] border-[var(--color-primary)] font-medium"
                  : "text-[var(--color-muted-foreground)] border-transparent hover:bg-[var(--color-muted)]/50 hover:text-[var(--color-foreground)]"
              }`}
              onClick={() => onSelect(c.id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                className="opacity-0 transition-all duration-200 hover:text-[var(--color-destructive)] group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--color-destructive)]/10"
                aria-label="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
