"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  }

  return (
    <div className="border-t border-[var(--color-border)]/60 bg-[var(--color-background)]/50 px-4 py-4 backdrop-blur md:px-10">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <div className="glass flex flex-1 items-end gap-2 rounded-3xl p-2 pl-4 border border-[var(--color-border)]/50 focus-within:border-[var(--color-primary)]/60 focus-within:ring-4 focus-within:ring-[var(--color-primary)]/10 transition-all duration-300">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask about your plants…"
            rows={1}
            className="min-h-[40px] max-h-40 flex-1 resize-none border-0 bg-transparent p-2 text-sm shadow-none outline-none placeholder:text-[var(--color-muted-foreground)]"
            disabled={disabled}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
            aria-label="Send"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-[var(--color-muted-foreground)]">
        Answers are AI-generated from the knowledge base. For high-value crops,
        confirm with your local extension office.
      </p>
    </div>
  );
}
