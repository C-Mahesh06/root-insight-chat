"use client";

import { Leaf } from "lucide-react";

export function Logo() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
      <Leaf className="h-5 w-5" />
    </div>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <Logo />
      <span
        className="text-lg font-semibold tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Plant<span className="text-[var(--color-primary)]">MD</span>
      </span>
    </div>
  );
}
