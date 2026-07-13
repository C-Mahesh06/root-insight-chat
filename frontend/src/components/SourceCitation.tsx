"use client";

import { BookOpen } from "lucide-react";
import type { Source } from "@/hooks/useChat";

interface SourceCitationProps {
  sources: Source[];
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-border)]/60 pt-3">
      <span className="text-xs font-semibold text-[var(--color-muted-foreground)] self-center mr-1">
        Sources:
      </span>
      {sources.map((s) => (
        <span
          key={`${s.document_id}-${s.page_number}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/8 border border-[var(--color-primary)]/15 px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)] transition-all duration-200 hover:bg-[var(--color-primary)]/15 hover:scale-[1.02] cursor-help"
          title={s.snippet}
        >
          <BookOpen className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[180px]">{s.title}</span>
          {s.page_number !== null && s.page_number !== undefined && (
            <span className="font-semibold opacity-70 border-l border-[var(--color-primary)]/20 pl-1.5">
              p.{s.page_number}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
