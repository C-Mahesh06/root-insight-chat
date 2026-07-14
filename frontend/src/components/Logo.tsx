"use client";

import { Leaf } from "lucide-react";

export function Logo({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizes = {
    sm: "h-8 w-8 rounded-lg",
    default: "h-9 w-9 rounded-xl",
    lg: "h-12 w-12 rounded-2xl",
  };
  const iconSizes = {
    sm: "h-4 w-4",
    default: "h-[18px] w-[18px]",
    lg: "h-6 w-6",
  };

  return (
    <div className={`${sizes[size]} flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-emerald-600 text-white shadow-xs`}>
      <Leaf className={iconSizes[size]} />
    </div>
  );
}

export function Wordmark({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const textSizes = {
    sm: "text-base",
    default: "text-lg",
    lg: "text-xl",
  };

  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} />
      <span
        className={`${textSizes[size]} font-bold tracking-tight text-[var(--color-foreground)]`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        Plant<span className="text-[var(--color-primary)]">MD</span>
      </span>
    </div>
  );
}
