"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("plantmd-theme", next ? "dark" : "light");
  }

  const defaultClasses = "flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-card)]/50 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-all cursor-pointer";

  return (
    <button
      onClick={toggle}
      className={className || defaultClasses}
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
}
