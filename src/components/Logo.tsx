import { Leaf } from "lucide-react";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-2xl bg-gradient-to-br from-primary-glow to-primary text-primary-foreground shadow-glow"
      style={{ width: size, height: size, boxShadow: "var(--shadow-glow)" }}
    >
      <Leaf size={size * 0.55} strokeWidth={2.25} />
    </div>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={36} />
      <span className="font-display text-xl font-semibold tracking-tight">
        Plant<span className="gradient-text">MD</span>
      </span>
    </div>
  );
}
