import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Leaf, Sparkles, Shield, BookOpen, MessagesSquare, ArrowRight, Mail, Camera, Bot, Users } from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PlantMD — AI Plant Disease Assistant" },
      { name: "description", content: "Diagnose plant diseases from photos, get research-backed treatment advice, and chat with an AI trained on agriculture research." },
      { property: "og:title", content: "PlantMD — AI Plant Disease Assistant" },
      { property: "og:description", content: "Diagnose plant diseases from photos and get research-backed treatment advice." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background leaf-bg">
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
        <Link to="/"><Wordmark /></Link>
        <nav className="hidden gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#about" className="hover:text-foreground">About</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
          <a href="#contact" className="hover:text-foreground">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/auth">
            <Button size="sm" className="rounded-full">Get started</Button>
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
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI agriculture assistant
          </div>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Diagnose plant disease.<br />
            <span className="gradient-text">Grow with confidence.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Upload a photo of a struggling plant. PlantMD identifies the disease, explains the cause, and recommends treatments — grounded in agriculture research papers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-full text-base shadow-glow">
                Get started free <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="rounded-full text-base">
                See how it works
              </Button>
            </a>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Research-backed</div>
            <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> AI-powered</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
          className="relative"
        >
          <div className="glass-strong relative rounded-3xl p-6 shadow-glass">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="ml-2 text-xs text-muted-foreground">PlantMD Chat</span>
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-primary-foreground">
                My tomato leaves have yellow spots with brown centers 🍅
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-card px-4 py-3 shadow-soft">
                <p className="mb-2 font-medium">Likely <span className="text-primary">Early Blight</span> (Alternaria solani).</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Remove infected leaves and improve airflow</li>
                  <li>• Apply copper fungicide weekly</li>
                  <li>• Mulch to prevent soil splash</li>
                </ul>
              </div>
              <div className="ml-auto flex max-w-[80%] items-center gap-2 rounded-2xl rounded-tr-md bg-secondary px-4 py-2.5">
                <Camera className="h-4 w-4 text-primary" />
                <span className="text-sm text-secondary-foreground">tomato-leaf.jpg</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-6 -top-6 h-32 w-32 animate-float rounded-full bg-primary-glow/40 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-40 w-40 animate-float rounded-full bg-primary/30 blur-3xl" style={{ animationDelay: "1.5s" }} />
        </motion.div>
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
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Features</p>
        <h2 className="mt-2 font-display text-4xl font-semibold md:text-5xl">Everything you need to keep plants healthy</h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="glass group rounded-3xl p-6 transition-transform hover:-translate-y-1"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-4 py-24">
      <div className="glass-strong grid gap-10 rounded-4xl p-10 md:grid-cols-2 md:p-14">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">About</p>
          <h2 className="mt-2 font-display text-4xl font-semibold">Nature meets AI</h2>
          <p className="mt-4 text-muted-foreground">
            PlantMD combines modern AI with decades of agricultural research. Our admins curate a growing library of research papers, extension bulletins, and agriculture textbooks. Every answer is cross-referenced against that knowledge base so you get advice you can trust.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <Stat label="Plant species" value="2,400+" />
            <Stat label="Diseases" value="800+" />
            <Stat label="Research docs" value="Growing" />
          </div>
        </div>
        <div className="relative">
          <div className="glass rounded-3xl p-6">
            <blockquote className="font-display text-2xl leading-snug">
              "It's like having an extension agent in my pocket. Saved my greenhouse last season."
            </blockquote>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 font-semibold text-primary">R</div>
              <div>
                <div className="text-sm font-medium">Rina S.</div>
                <div className="text-xs text-muted-foreground">Market gardener</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold text-primary">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const faqs = [
  { q: "Is PlantMD free to use?", a: "Yes — creating an account and asking questions is free. Heavy usage may be rate-limited to keep the service healthy." },
  { q: "How accurate is the diagnosis?", a: "PlantMD is highly accurate for common diseases and grounds answers in curated research. For high-value crops, always confirm with a local extension office." },
  { q: "Can I upload photos?", a: "Yes — describe the symptoms and attach a plant photo directly in the chat. PlantMD analyzes both." },
  { q: "Who uploads the research documents?", a: "Only workspace admins can add PDFs, research papers, and books to the knowledge base." },
  { q: "Where is my data stored?", a: "Your chats live in your browser (localStorage) — private to you and never sent to us. Your account and any uploaded photos live in our secure Cloud backend." },
];

function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-24">
      <div className="mb-10 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">FAQ</p>
        <h2 className="mt-2 font-display text-4xl font-semibold md:text-5xl">Common questions</h2>
      </div>
      <Accordion type="single" collapsible className="glass rounded-3xl px-6">
        {faqs.map((f, i) => (
          <AccordionItem key={f.q} value={`q${i}`} className="border-b border-border last:border-0">
            <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <section id="contact" className="mx-auto max-w-4xl px-4 py-24">
      <div className="glass-strong rounded-4xl p-10 md:p-14">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Contact</p>
            <h2 className="mt-2 font-display text-4xl font-semibold">Get in touch</h2>
            <p className="mt-4 text-muted-foreground">
              Questions, partnerships, or research collaborations — we'd love to hear from you.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:hello@plantmd.app" className="hover:underline">hello@plantmd.app</a>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
              toast.success("Thanks — we'll be in touch.");
            }}
            className="space-y-3"
          >
            <Input required placeholder="Your name" />
            <Input required type="email" placeholder="you@email.com" />
            <Textarea required placeholder="What's on your mind?" rows={4} />
            <Button type="submit" className="w-full rounded-full" disabled={sent}>
              {sent ? "Sent!" : "Send message"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
        <Wordmark />
        <div>© {new Date().getFullYear()} PlantMD. Grown with care.</div>
      </div>
    </footer>
  );
}
