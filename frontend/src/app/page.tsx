"use client";

import Link from "next/link";
import {
  Leaf, Sparkles, Shield, BookOpen, MessagesSquare, ArrowRight,
  Mail, Camera, Bot, ChevronDown, Zap, Database, Eye,
} from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] overflow-hidden">
      <Nav />
      <Hero />
      <LogoBar />
      <Features />
      <HowItWorks />
      <About />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

/* ──────────────────── Navigation ──────────────────── */
function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)]/40 bg-[var(--color-background)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/"><Wordmark /></Link>
        <nav className="hidden items-center gap-8 text-[13px] font-medium text-[var(--color-muted-foreground)] md:flex">
          {["Features", "How it works", "About", "FAQ"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="transition-colors hover:text-[var(--color-foreground)]"
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer" />
          <Link
            href="/auth"
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-[13px] font-semibold text-[var(--color-primary-foreground)] transition-all hover:bg-[var(--color-primary-hover)] shadow-xs hover:shadow-md"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ──────────────────── Hero ──────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-1/3 -top-1/4 h-[600px] w-[600px] rounded-full bg-[var(--color-primary)]/[0.06] blur-[100px]" />
        <div className="absolute -right-1/4 top-1/3 h-[500px] w-[500px] rounded-full bg-[var(--color-accent)]/[0.05] blur-[100px]" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-20 md:grid-cols-2 md:items-center md:pt-28">
        {/* Left — Copy */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-muted-foreground)] shadow-xs">
            <Zap className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            AI-powered plant diagnostics
          </div>

          <h1
            className="mt-6 text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Diagnose plant
            <br />
            disease with
            <br />
            <span className="gradient-text">confidence.</span>
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--color-muted-foreground)]">
            Upload a photo or describe symptoms. PlantMD identifies diseases,
            explains causes, and recommends treatments — all grounded in
            peer-reviewed agricultural research.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-glow transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-md"
            >
              Start diagnosing <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--color-muted)]"
            >
              See how it works
            </a>
          </div>

          <div className="mt-8 flex items-center gap-6 text-[13px] text-[var(--color-muted-foreground)]">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Research-backed
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Free to use
            </div>
          </div>
        </div>

        {/* Right — Chat mockup */}
        <div className="relative">
          <div className="glass-strong relative rounded-2xl p-5 shadow-glass">
            {/* Window controls */}
            <div className="flex items-center gap-2 border-b border-[var(--color-border)]/50 pb-3.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
              </div>
              <span className="ml-2 text-[11px] font-medium text-[var(--color-muted-foreground)]">
                PlantMD Chat
              </span>
            </div>
            {/* Messages */}
            <div className="mt-4 space-y-3.5">
              <div className="ml-auto max-w-[78%] rounded-[16px] rounded-tr-sm bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-medium text-white">
                My tomato leaves have yellow spots with brown centers 🍅
              </div>
              <div className="max-w-[84%] rounded-[16px] rounded-tl-sm bg-[var(--color-card)] px-4 py-3 text-[13px] shadow-soft border border-[var(--color-border)]/40">
                <p className="mb-1.5 font-semibold text-[var(--color-foreground)]">
                  Likely <span className="text-[var(--color-primary)]">Early Blight</span>{" "}
                  <span className="text-[var(--color-muted-foreground)] font-normal">(Alternaria solani)</span>
                </p>
                <ul className="space-y-1 text-[12px] text-[var(--color-muted-foreground)]">
                  <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-primary)]" />Remove infected leaves and improve airflow</li>
                  <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-primary)]" />Apply copper fungicide weekly</li>
                  <li className="flex items-start gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-primary)]" />Mulch to prevent soil splash</li>
                </ul>
              </div>
              <div className="ml-auto flex max-w-[78%] items-center gap-2 rounded-[16px] rounded-tr-sm bg-[var(--color-muted)] px-4 py-2.5">
                <Camera className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span className="text-[12px] font-medium text-[var(--color-muted-foreground)]">tomato-leaf.jpg</span>
              </div>
            </div>
          </div>
          {/* Decorative blurs */}
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[var(--color-primary)]/15 blur-[60px] animate-float" />
          <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-[var(--color-accent)]/10 blur-[60px] animate-float" style={{ animationDelay: "2s" }} />
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── Trust bar ──────────────────── */
function LogoBar() {
  const items = ["2,400+ Species", "800+ Diseases", "Peer-reviewed Sources", "Multi-language"];
  return (
    <section className="border-y border-[var(--color-border)]/40 bg-[var(--color-muted)]/30">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-5">
        {items.map((t) => (
          <span key={t} className="text-[12px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────── Features ──────────────────── */
const features = [
  { icon: Camera, title: "Image diagnosis", desc: "Upload a plant photo — PlantMD identifies diseases and pests in seconds using vision AI." },
  { icon: BookOpen, title: "Research-backed", desc: "Every answer is grounded in agriculture papers, textbooks, and extension publications." },
  { icon: MessagesSquare, title: "Conversational", desc: "Ask follow-ups naturally. PlantMD remembers context and cites its sources inline." },
  { icon: Shield, title: "Safe treatments", desc: "Cultural, organic, and chemical options with dosage guidance and safety warnings." },
  { icon: Database, title: "Growing knowledge", desc: "Admins continuously add research PDFs and URLs — the system gets smarter over time." },
  { icon: Eye, title: "Vision-verified", desc: "Non-plant images are automatically detected and rejected — no noise, just diagnosis." },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-14 max-w-2xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-primary)]">Features</p>
        <h2 className="mt-2.5 text-3xl font-bold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          Everything you need to keep plants healthy
        </h2>
        <p className="mt-3 text-[15px] text-[var(--color-muted-foreground)]">
          From instant photo diagnosis to literature-grounded treatment plans.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-card)] p-6 transition-all duration-300 hover:border-[var(--color-primary)]/25 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-primary)]/8 text-[var(--color-primary)] transition-all duration-300 group-hover:bg-[var(--color-primary)] group-hover:text-white group-hover:shadow-glow">
              <f.icon className="h-[18px] w-[18px]" />
            </div>
            <h3 className="mt-4 text-[15px] font-bold text-[var(--color-foreground)]">{f.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────── How It Works ──────────────────── */
const steps = [
  { num: "01", title: "Upload or describe", desc: "Share a photo of the affected plant or describe symptoms in plain language." },
  { num: "02", title: "AI analysis", desc: "PlantMD cross-references your input against curated agriculture literature using RAG." },
  { num: "03", title: "Get treatment plan", desc: "Receive a diagnosis with step-by-step organic and chemical treatment options." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-[var(--color-border)]/40 bg-[var(--color-muted)]/20">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 max-w-2xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-primary)]">How it works</p>
          <h2 className="mt-2.5 text-3xl font-bold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Three steps to a healthier garden
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.num} className="relative rounded-2xl border border-[var(--color-border)]/40 bg-[var(--color-card)] p-7">
              <span className="text-[40px] font-black leading-none text-[var(--color-primary)]/10" style={{ fontFamily: "var(--font-display)" }}>
                {s.num}
              </span>
              <h3 className="mt-3 text-[15px] font-bold text-[var(--color-foreground)]">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── About ──────────────────── */
function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-10 rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-card)] p-8 md:grid-cols-2 md:p-12">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-primary)]">About</p>
          <h2 className="mt-2.5 text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Nature meets AI
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--color-muted-foreground)]">
            PlantMD combines modern AI with decades of agricultural research.
            Our admins curate a growing library of research papers, extension
            bulletins, and agriculture textbooks. Every answer is
            cross-referenced against that knowledge base so you get advice you
            can trust.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6">
            {[
              { label: "Plant species", value: "2,400+" },
              { label: "Diseases", value: "800+" },
              { label: "Research docs", value: "Growing" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-[var(--color-primary)]" style={{ fontFamily: "var(--font-display)" }}>{s.value}</div>
                <div className="mt-0.5 text-[11px] font-medium text-[var(--color-muted-foreground)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center">
          <div className="w-full rounded-2xl border border-[var(--color-border)]/40 bg-[var(--color-muted)]/30 p-6">
            <blockquote className="text-xl font-semibold leading-snug" style={{ fontFamily: "var(--font-display)" }}>
              &ldquo;It&apos;s like having an extension agent in my pocket. Saved my greenhouse last season.&rdquo;
            </blockquote>
            <div className="mt-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary)]/10 text-sm font-bold text-[var(--color-primary)]">R</div>
              <div>
                <div className="text-[13px] font-semibold">Rina S.</div>
                <div className="text-[11px] text-[var(--color-muted-foreground)]">Market gardener</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── FAQ ──────────────────── */
const faqs = [
  { q: "Is PlantMD free to use?", a: "Yes — creating an account and asking questions is free. Heavy usage may be rate-limited to keep the service healthy." },
  { q: "How accurate is the diagnosis?", a: "PlantMD is highly accurate for common diseases and grounds answers in curated research. For high-value crops, always confirm with a local extension office." },
  { q: "Can I upload photos?", a: "Yes — describe the symptoms and attach a plant photo directly in the chat. PlantMD analyzes both using vision AI." },
  { q: "Who uploads the research documents?", a: "Only workspace admins can add PDFs, research papers, and URLs to the knowledge base." },
  { q: "Where is my data stored?", a: "Your conversations are stored securely in our database. Your account and uploaded documents are protected with row-level security." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="border-t border-[var(--color-border)]/40 bg-[var(--color-muted)]/20">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="mb-10 text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--color-primary)]">FAQ</p>
          <h2 className="mt-2.5 text-3xl font-bold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Common questions
          </h2>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-card)] divide-y divide-[var(--color-border)]/50 overflow-hidden">
          {faqs.map((f, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4.5 text-left text-[14px] font-semibold transition-colors hover:bg-[var(--color-muted)]/30 cursor-pointer"
              >
                {f.q}
                <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${open === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <div className="px-6 pb-4.5 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">{f.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── CTA ──────────────────── */
function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-emerald-700 px-8 py-16 text-center text-white shadow-glow md:px-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-60" />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Start diagnosing your plants today
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-white/80">
            Join growers who trust PlantMD to keep their crops healthy with AI-powered, research-grounded advice.
          </p>
          <Link
            href="/auth"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────── Footer ──────────────────── */
function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)]/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-[12px] text-[var(--color-muted-foreground)] md:flex-row">
        <Wordmark size="sm" />
        <div>© {new Date().getFullYear()} PlantMD. Built with care for growers everywhere.</div>
      </div>
    </footer>
  );
}
