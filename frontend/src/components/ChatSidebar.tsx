"use client";

import { Plus, MessageSquare, Trash2, X, Sparkles } from "lucide-react";
import type { Conversation } from "@/hooks/useChat";
import { Wordmark } from "./Logo";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  userEmail?: string | null;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen = false,
  onClose,
  userEmail,
}: ChatSidebarProps) {
  const sidebarContent = (
    <div className="flex h-full flex-col bg-[var(--color-sidebar)] border-r border-[var(--color-border)]/50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]/40">
        <Wordmark size="sm" />
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* New Chat */}
      <div className="p-3">
        <button
          onClick={() => { onNew(); if (onClose) onClose(); }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-[12px] font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <div className="px-3 mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
            History
          </span>
          {conversations.length > 0 && (
            <span className="text-[10px] font-semibold bg-[var(--color-muted)] text-[var(--color-muted-foreground)] px-1.5 py-0.5 rounded">
              {conversations.length}
            </span>
          )}
        </div>

        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <Sparkles className="h-5 w-5 text-[var(--color-muted-foreground)]/30 mb-2" />
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              No conversations yet
            </p>
          </div>
        )}

        <div className="space-y-0.5">
          {conversations.map((c) => {
            const isActive = activeId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => { onSelect(c.id); if (onClose) onClose(); }}
                className={`group relative flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] transition-all duration-150 ${
                  isActive
                    ? "bg-[var(--color-primary)]/8 text-[var(--color-foreground)] font-semibold"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/60 hover:text-[var(--color-foreground)]"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[var(--color-primary)]" />
                )}
                <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[var(--color-primary)]" : ""}`} />
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-all cursor-pointer"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* User footer */}
      {userEmail && (
        <div className="p-3 border-t border-[var(--color-border)]/40 flex flex-col gap-2">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-[var(--color-muted)]/30">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[11px] font-bold text-[var(--color-primary)]">
              {userEmail.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-[var(--color-foreground)] truncate">
                {userEmail.split("@")[0]}
              </p>
              <p className="text-[9px] text-[var(--color-muted-foreground)] truncate">
                {userEmail}
              </p>
            </div>
          </div>
          <p className="text-center text-[9px] text-[var(--color-muted-foreground)]/50 font-bold tracking-wider hover:text-[var(--color-primary)]/70 transition-colors">
            DEV BY MAHESH
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col md:flex h-full">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in" />
          <aside className="relative flex w-64 max-w-[80vw] flex-col h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
