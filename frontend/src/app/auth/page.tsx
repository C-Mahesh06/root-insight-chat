"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export default function AuthPage() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, user } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setError("Check your email for a confirmation link!");
      } else {
        await signInWithEmail(email, password);
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[500px] w-[500px] rounded-full bg-[var(--color-primary)]/[0.05] blur-[100px]" />
        <div className="absolute -right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-[var(--color-accent)]/[0.04] blur-[100px]" />
      </div>

      {/* Top Bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer" />
      </div>

      {/* Card */}
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-card)] p-8 shadow-glass">
          {/* Header */}
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <Wordmark />
            <p className="text-[13px] text-[var(--color-muted-foreground)]">
              {isSignUp ? "Create your account" : "Welcome back"}
            </p>
          </div>

          {/* Error / Success */}
          {error && (
            <div
              className={`mb-5 rounded-xl px-4 py-2.5 text-[13px] font-medium ${
                error.includes("Check your email")
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              }`}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-input)] bg-[var(--color-background)] py-3 pl-10 pr-4 text-[13px] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full rounded-xl border border-[var(--color-input)] bg-[var(--color-background)] py-3 pl-10 pr-10 text-[13px] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--color-primary)] py-3 text-[13px] font-semibold text-[var(--color-primary-foreground)] shadow-xs transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">or</span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] py-3 text-[13px] font-semibold transition-all hover:bg-[var(--color-muted)] hover:shadow-xs cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Toggle */}
          <p className="mt-6 text-center text-[13px] text-[var(--color-muted-foreground)]">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
