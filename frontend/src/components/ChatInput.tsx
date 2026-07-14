"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Plus, Mic, X } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export function ChatInput({
  onSend,
  disabled,
  selectedModel,
  setSelectedModel,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isExpanded = isFocused || input.length > 0 || attachments.length > 0;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      if (!isExpanded) {
        textareaRef.current.style.height = "";
      } else {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
      }
    }
  }, [input, isExpanded]);

  // Click outside to collapse
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (input.trim() === "" && attachments.length === 0) {
          setIsFocused(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [input, attachments]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;
    if (disabled) return;
    onSend(trimmed, attachments);
    setInput("");
    setAttachments([]);
    setIsFocused(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div ref={containerRef} className="w-full">
      <div
        onClick={() => textareaRef.current?.focus()}
        className={`relative flex flex-col w-full border bg-[var(--color-card)] text-[var(--color-foreground)] shadow-md chat-input-container ${
          isExpanded
            ? "rounded-2xl p-4 gap-2.5 border-[var(--color-primary)]/30 shadow-glow"
            : "rounded-full py-1.5 pl-5 pr-1.5 h-[48px] justify-center cursor-text border-[var(--color-border)]"
        }`}
      >
        {/* Textarea row */}
        <div className="flex w-full items-center gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about plant diseases..."
            rows={1}
            className={`resize-none border-0 bg-transparent text-[13px] shadow-none outline-none placeholder:text-[var(--color-muted-foreground)]/60 w-full focus:ring-0 transition-all duration-300 ${
              isExpanded ? "py-0.5 pr-2" : "h-9 py-2 pr-10"
            }`}
            disabled={disabled}
          />

          {/* Collapsed send button */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`transition-all duration-300 ${
              isExpanded
                ? "opacity-0 scale-75 pointer-events-none w-0 overflow-hidden"
                : "opacity-100 scale-100 w-9 h-9 shrink-0"
            }`}
          >
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || disabled}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
            >
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : input.trim() || attachments.length > 0 ? (
                <Send className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded controls */}
        <div
          className={`flex flex-col gap-2 transition-all duration-300 ${
            isExpanded
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-3 pointer-events-none h-0 overflow-hidden"
          }`}
        >
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1 border-t border-[var(--color-border)]/30 pt-2">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--color-muted)] border border-[var(--color-border)]/50 px-2 py-1 text-[11px] font-medium text-[var(--color-foreground)]"
                >
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between border-t border-[var(--color-border)]/30 pt-2"
          >
            <div className="flex items-center gap-1.5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
                aria-label="Add attachment"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                Attach images for vision diagnosis
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="h-8 px-2 bg-[var(--color-card)] hover:bg-[var(--color-muted)] border border-[var(--color-border)]/50 rounded-lg text-[11px] font-semibold text-[var(--color-foreground)] outline-none transition-all cursor-pointer appearance-none pr-6 relative"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 6px center",
                  backgroundSize: "12px",
                }}
              >
                <option value="my-own-model">✨ Aether AI (Custom)</option>
                <option value="chatgpt">💬 ChatGPT</option>
                <option value="gemini">♊ Gemini</option>
                <option value="llama">🦙 Llama</option>
              </select>

              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachments.length === 0) || disabled}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                aria-label="Send"
              >
                {disabled ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
