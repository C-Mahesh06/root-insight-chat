"use client";

import Link from "next/link";
import {
  Leaf, Sparkles, Shield, BookOpen, MessagesSquare, ArrowRight,
  Mail, Camera, Bot, ChevronDown,
} from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)] leaf-bg">
      <Nav />
      <Hero />
      <Features />
      <About />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-4 z-50 mx-auto max-w-6xl px-4">
      <div className="glass-strong flex items-center justify-between gap-4 rounded-full px-5 py-2.5">
        <Link href="/"><Wordmark /></Link>
        <nav className="hidden gap-6 text-sm font-medium text-[var(--color-muted-foreground)] md:flex">
          <a href="#features" className="hover:text-[var(--color-foreground)]">Features</a>
          <a href="#about" className="hover:text-[var(--color-foreground)]">About</a>
          <a href="#faq" className="hover:text-[var(--color-foreground)]">FAQ</a>
          <a href="#contact" className="hover:text-[var(--color-foreground)]">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/auth"
            className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-16 md:pt-24">
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)]/60 px-3 py-1 text-xs font-medium text-[var(--color-muted-foreground)] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            AI agriculture assistant
          </div>
          <h1
            className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Diagnose plant disease.<br />
            <span className="gradient-text">Grow with confidence.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-[var(--color-muted-foreground)]">
            Upload a photo of a struggling plant. PlantMD identifies the disease, explains the cause, and recommends treatments — grounded in agriculture research papers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth"
              className="inline-flex items-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-base font-medium text-[var(--color-primary-foreground)] shadow-glow transition-opacity hover:opacity-90"
            >
              Get started free <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-6 py-3 text-base font-medium transition-colors hover:bg-[var(--color-muted)]"
            >
              See how it works
            </a>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-[var(--color-muted-foreground)]">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-[var(--color-primary)]" /> Research-backed</div>
            <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-[var(--color-primary)]" /> AI-powered</div>
          </div>
        </div>

        <div className="relative">
          <div className="glass-strong relative rounded-3xl p-6 shadow-glass">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-destructive)]/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
              <span className="ml-2 text-xs text-[var(--color-muted-foreground)]">PlantMD Chat</span>
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-[var(--color-primary)] px-4 py-2.5 text-[var(--color-primary-foreground)]">
                My tomato leaves have yellow spots with brown centers 🍅
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-[var(--color-card)] px-4 py-3 shadow-soft">
                <p className="mb-2 font-medium">
                  Likely <span className="text-[var(--color-primary)]">Early Blight</span> (Alternaria solani).
                </p>
                <ul className="space-y-1 text-[var(--color-muted-foreground)]">
                  <li>• Remove infected leaves and improve airflow</li>
                  <li>• Apply copper fungicide weekly</li>
                  <li>• Mulch to prevent soil splash</li>
                </ul>
              </div>
              <div className="ml-auto flex max-w-[80%] items-center gap-2 rounded-2xl rounded-tr-md bg-[var(--color-secondary)] px-4 py-2.5">
                <Camera className="h-4 w-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-secondary-foreground)]">tomato-leaf.jpg</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-6 -top-6 h-32 w-32 animate-float rounded-full bg-[var(--color-primary)]/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-40 w-40 animate-float rounded-full bg-[var(--color-primary)]/15 blur-3xl" style={{ animationDelay: "1.5s" }} />
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: Camera, title: "Image diagnosis", desc: "Upload a plant photo. PlantMD identifies diseases and pests in seconds." },
  { icon: BookOpen, title: "Research-backed", desc: "Answers grounded in agriculture papers, books, and extension publications." },
  { icon: MessagesSquare, title: "Conversational", desc: "Ask follow-ups. PlantMD remembers context and cites its sources." },
  { icon: Shield, title: "Safe treatments", desc: "Cultural, organic, and chemical options — with dosage guidance and warnings." },
  { icon: Sparkles, title: "Smart suggestions", desc: "Auto-suggested questions help you get to the right answer faster." },
  { icon: Leaf, title: "For every grower", desc: "From backyard gardeners to commercial farms and researchers." },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24">
      <div className="mb-14 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-[var(--color-primary)]">Features</p>
        <h2 className="mt-2 text-4xl font-semibold md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
          Everything you need to keep plants healthy
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="glass group rounded-3xl p-6 transition-transform hover:-translate-y-1"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] transition-colors group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-primary-foreground)]">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-4 py-24">
      <div className="glass-strong grid gap-10 rounded-[2rem] p-10 md:grid-cols-2 md:p-14">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-[var(--color-primary)]">About</p>
          <h2 className="mt-2 text-4xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>Nature meets AI</h2>
          <p className="mt-4 text-[var(--color-muted-foreground)]">
            PlantMD combines modern AI with decades of agricultural research. Our admins curate a growing library of research papers, extension bulletins, and agriculture textbooks. Every answer is cross-referenced against that knowledge base so you get advice you can trust.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { label: "Plant species", value: "2,400+" },
              { label: "Diseases", value: "800+" },
              { label: "Research docs", value: "Growing" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-semibold text-[var(--color-primary)]" style={{ fontFamily: "var(--font-display)" }}>{s.value}</div>
                <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="glass rounded-3xl p-6">
            <blockquote className="text-2xl leading-snug" style={{ fontFamily: "var(--font-display)" }}>
              &ldquo;It&apos;s like having an extension agent in my pocket. Saved my greenhouse last season.&rdquo;
            </blockquote>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-primary)]/15 font-semibold text-[var(--color-primary)]">R</div>
              <div>
                <div className="text-sm font-medium">Rina S.</div>
                <div className="text-xs text-[var(--color-muted-foreground)]">Market gardener</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const faqs = [
  { q: "Is PlantMD free to use?", a: "Yes — creating an account and asking questions is free. Heavy usage may be rate-limited to keep the service healthy." },
  { q: "How accurate is the diagnosis?", a: "PlantMD is highly accurate for common diseases and grounds answers in curated research. For high-value crops, always confirm with a local extension office." },
  { q: "Can I upload photos?", a: "Yes — describe the symptoms and attach a plant photo directly in the chat. PlantMD analyzes both." },
  { q: "Who uploads the research documents?", a: "Only workspace admins can add PDFs, research papers, and books to the knowledge base." },
  { q: "Where is my data stored?", a: "Your conversations are stored securely in our database. Your account and uploaded documents are protected with row-level security." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-24">
      <div className="mb-10 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-[var(--color-primary)]">FAQ</p>
        <h2 className="mt-2 text-4xl font-semibold md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>Common questions</h2>
      </div>
      <div className="glass rounded-3xl px-6 divide-y divide-[var(--color-border)]">
        {faqs.map((f, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between py-4 text-left text-base font-medium"
            >
              {f.q}
              <ChevronDown className={`h-4 w-4 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <div className="pb-4 text-sm text-[var(--color-muted-foreground)]">{f.a}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <section id="contact" className="mx-auto max-w-4xl px-4 py-24">
      <div className="glass-strong rounded-[2rem] p-10 md:p-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-[var(--color-primary)]">Contact</p>
            <h2 className="mt-2 text-4xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>Get in touch</h2>
            <p className="mt-4 text-[var(--color-muted-foreground)]">
              Questions, partnerships, or research collaborations — we&apos;d love to hear from you.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-[var(--color-primary)]" />
              <a href="mailto:hello@plantmd.app" className="hover:underline">hello@plantmd.app</a>
            </div>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            className="space-y-3"
          >
            <input required placeholder="Your name" className="w-full rounded-xl border border-[var(--color-input)] bg-[var(--color-background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]" />
            <input required type="email" placeholder="you@email.com" className="w-full rounded-xl border border-[var(--color-input)] bg-[var(--color-background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]" />
            <textarea required placeholder="What's on your mind?" rows={4} className="w-full rounded-xl border border-[var(--color-input)] bg-[var(--color-background)] px-4 py-2.5 text-sm outline-none resize-none focus:border-[var(--color-primary)]" />
            <button
              type="submit"
              disabled={sent}
              className="w-full rounded-full bg-[var(--color-primary)] py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {sent ? "Sent!" : "Send message"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)]/60 bg-[var(--color-background)]/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--color-muted-foreground)] md:flex-row">
        <Wordmark />
        <div>© {new Date().getFullYear()} PlantMD. Grown with care.</div>
      </div>
    </footer>
  );
}
