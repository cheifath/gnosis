"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useCallback } from "react"
import {
  Shield,
  Github,
  Zap,
  Bug,
  GitPullRequest,
  ArrowRight,
  Code2,
  CheckCircle2,
  Star,
  Mail,
  Phone,
  ChevronDown,
  Eye,
  Lock,
  BarChart3,
  Clock,
  Users,
  MessageSquare,
  Terminal,
  FileCode2,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

/* ── Intersection-observer hook (lightweight, no deps) ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible")
          // also reveal children with .reveal class
          el.querySelectorAll(".reveal").forEach((c) => c.classList.add("visible"))
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

/* ── Animated counter ── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1500
          const step = Math.max(1, Math.floor(target / (duration / 16)))
          let current = 0
          const tick = () => {
            current = Math.min(current + step, target)
            setCount(current)
            if (current < target) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          observer.unobserve(el)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ── FAQ Accordion ── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden card-glow">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left bg-slate-900/50 hover:bg-slate-900/80 transition"
      >
        <span className="font-medium text-sm md:text-base">{q}</span>
        <ChevronDown
          size={18}
          className={`text-slate-400 shrink-0 ml-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 pt-2 text-slate-400 text-sm leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push(user.role === "admin" ? "/admin/dashboard" : "/dashboard")
    }
  }, [loading, user, router])

  /* Refs for reveal-on-scroll sections */
  const refStats = useReveal()
  const refHowItWorks = useReveal()
  const refFeatures = useReveal()
  const refBefore = useReveal()
  const refFaq = useReveal()
  const refContact = useReveal()
  const refCta = useReveal()

  /* Navbar scroll shadow */
  const [scrolled, setScrolled] = useState(false)
  const handleScroll = useCallback(() => setScrolled(window.scrollY > 20), [])
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  if (loading) return null

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* ─── Background glow orbs (CSS only, no JS) ─── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px] animate-pulse-glow" />
        <div className="absolute top-1/3 -right-48 w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[100px] animate-pulse-glow [animation-delay:2s]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[100px] animate-pulse-glow [animation-delay:4s]" />
      </div>

      {/* ─── Navbar ─── */}
      <nav
        className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-300 ${
          scrolled
            ? "bg-slate-950/90 border-b border-slate-800/60 shadow-lg shadow-black/20"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Shield className="text-purple-400 group-hover:scale-110 transition-transform" size={28} />
            <span className="text-xl font-bold tracking-tight">GNOSIS</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#how-it-works" className="hover:text-white transition">How it works</a>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
            <a href="#contact" className="hover:text-white transition">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                Sign in
              </Button>
            </Link>
            <Link href="/login?mode=signup">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/20">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Copy */}
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium mb-6">
                <Sparkles size={14} className="animate-float" /> AI-Powered Code Review &mdash; 100% Free
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6">
                Ship Secure Code{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400">
                  with Confidence
                </span>
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg">
                Gnosis automatically reviews every pull request using static analysis
                and AI — catching security flaws, code smells, and complexity issues
                before they reach production.
              </p>
              <div className="flex flex-wrap gap-4 mb-8">
                <Link href="/login?mode=signup">
                  <Button size="lg" className="bg-purple-600 hover:bg-purple-500 text-base px-8 shadow-xl shadow-purple-600/20 hover:shadow-purple-600/40 transition-all">
                    <Github size={18} /> Connect with GitHub
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg" className="border-slate-700 text-slate-300 hover:text-white text-base group">
                    See how it works
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-green-400" /> Free forever</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-green-400" /> No credit card</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-green-400" /> Setup in 60s</span>
              </div>
            </div>

            {/* Code preview card */}
            <div className="hidden lg:block animate-slide-right">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-purple-900/10 overflow-hidden animate-float [animation-duration:8s]">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="ml-3 text-xs text-slate-500 flex items-center gap-2">
                    <Terminal size={12} /> gnosis-review.log
                  </span>
                </div>
                <div className="p-5 font-mono text-sm leading-relaxed space-y-4">
                  <div className="flex items-start gap-3">
                    <GitPullRequest className="text-green-400 mt-0.5 shrink-0" size={16} />
                    <div>
                      <p className="text-green-400 font-semibold">Pull Request #42 opened</p>
                      <p className="text-slate-500 text-xs">feat: add user authentication</p>
                    </div>
                  </div>
                  <div className="border-l-2 border-purple-500/40 pl-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Bug className="text-yellow-400 mt-0.5 shrink-0" size={14} />
                      <p className="text-slate-300 text-xs">
                        <span className="text-yellow-400 font-medium">Warning:</span>{" "}
                        SQL injection risk in <span className="text-purple-300">auth.py:34</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Bug className="text-red-400 mt-0.5 shrink-0" size={14} />
                      <p className="text-slate-300 text-xs">
                        <span className="text-red-400 font-medium">Critical:</span>{" "}
                        Hardcoded secret in <span className="text-purple-300">config.py:12</span>
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="text-green-400 mt-0.5 shrink-0" size={14} />
                      <p className="text-slate-300 text-xs">
                        <span className="text-green-400 font-medium">Fix:</span>{" "}
                        Use parameterized queries &amp; env variables
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-3 flex items-center gap-2">
                    <Sparkles className="text-purple-400" size={14} />
                    <p className="text-purple-400 text-xs font-medium">
                      2 issues found &middot; 2 fixes generated &middot; Review complete
                      <span className="animate-blink ml-0.5">|</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="border-y border-slate-800/60 bg-slate-900/30" ref={refStats}>
        <div className="reveal max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 10000, suffix: "+", label: "PRs Analyzed", icon: GitPullRequest },
            { value: 45000, suffix: "+", label: "Issues Caught", icon: Bug },
            { value: 500, suffix: "+", label: "Repositories", icon: FileCode2 },
            { value: 99, suffix: "%", label: "Accuracy Rate", icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.label} className="space-y-2">
              <s.icon size={20} className="text-purple-400 mx-auto mb-2" />
              <p className="text-3xl md:text-4xl font-extrabold text-white">
                <Counter target={s.value} suffix={s.suffix} />
              </p>
              <p className="text-slate-500 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Before / After ─── */}
      <section className="py-24" ref={refBefore}>
        <div className="reveal max-w-5xl mx-auto px-6 text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Before &amp; After Gnosis</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            See the difference AI-powered review makes to your workflow.
          </p>
        </div>
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          {/* Before */}
          <div className="reveal rounded-xl border border-red-500/20 bg-slate-900/50 p-6 card-glow">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <Eye className="text-red-400" size={16} />
              </div>
              <h3 className="font-semibold text-red-400">Without Gnosis</h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-400">
              {[
                "Manual code reviews take hours",
                "Security flaws slip into production",
                "Inconsistent review quality across team",
                "No automated fix suggestions",
                "Complex changes lack coverage",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400/60 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          {/* After */}
          <div className="reveal rounded-xl border border-green-500/20 bg-slate-900/50 p-6 card-glow">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <Sparkles className="text-green-400" size={16} />
              </div>
              <h3 className="font-semibold text-green-400">With Gnosis</h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-400">
              {[
                "Instant AI reviews on every pull request",
                "Security vulnerabilities caught automatically",
                "Consistent, thorough review on every PR",
                "AI-generated fix suggestions with code",
                "Full coverage with multi-tool analysis",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-green-400 mt-0.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how-it-works" className="py-24 bg-slate-900/20" ref={refHowItWorks}>
        <div className="reveal max-w-5xl mx-auto px-6 text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How Gnosis Works</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Three simple steps from pull request to actionable intelligence.
          </p>
        </div>
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-8 stagger">
          {[
            {
              step: "01",
              title: "Connect Repository",
              desc: "Link your GitHub repositories with one click. Gnosis installs as a GitHub App and starts watching for PRs.",
              icon: Github,
              gradient: "from-purple-500/20 to-blue-500/20",
            },
            {
              step: "02",
              title: "AI Reviews PRs",
              desc: "Every pull request is analyzed with Bandit, Flake8, Radon, and our AI engine for comprehensive coverage.",
              icon: Zap,
              gradient: "from-blue-500/20 to-cyan-500/20",
            },
            {
              step: "03",
              title: "Get Fix Suggestions",
              desc: "Receive inline comments with severity ratings and AI-generated fix suggestions with corrected code.",
              icon: CheckCircle2,
              gradient: "from-cyan-500/20 to-green-500/20",
            },
          ].map((item, i) => (
            <div key={item.step} className="reveal relative">
              {/* Connector line */}
              {i < 2 && (
                <div className="hidden md:block absolute top-12 -right-4 w-8 border-t border-dashed border-slate-700 z-10" />
              )}
              <div className={`rounded-xl border border-slate-800 bg-gradient-to-br ${item.gradient} p-8 text-center card-glow h-full`}>
                <span className="text-xs font-bold text-purple-400 tracking-widest">{item.step}</span>
                <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto my-5">
                  <item.icon className="text-purple-400" size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24" ref={refFeatures}>
        <div className="reveal max-w-5xl mx-auto px-6 text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Comprehensive pull request intelligence — from static analysis to AI-powered insights.
          </p>
        </div>
        <div className="max-w-5xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
          {[
            { title: "Security Scanning", desc: "Bandit detects vulnerabilities, injection risks, and insecure patterns automatically.", icon: Shield, color: "text-red-400", borderHover: "hover:border-red-500/30" },
            { title: "Code Quality", desc: "Flake8 enforces PEP 8 compliance and catches common code smells in every change.", icon: Code2, color: "text-blue-400", borderHover: "hover:border-blue-500/30" },
            { title: "Complexity Metrics", desc: "Radon calculates cyclomatic complexity and maintainability index for every file.", icon: BarChart3, color: "text-yellow-400", borderHover: "hover:border-yellow-500/30" },
            { title: "AI Code Review", desc: "LLM-powered reviews provide human-like feedback with detailed explanations.", icon: Zap, color: "text-purple-400", borderHover: "hover:border-purple-500/30" },
            { title: "Fix Suggestions", desc: "Get AI-generated fix suggestions with corrected code snippets ready to apply.", icon: CheckCircle2, color: "text-green-400", borderHover: "hover:border-green-500/30" },
            { title: "GitHub Integration", desc: "Posts review comments directly on pull requests as a GitHub Check Run.", icon: Github, color: "text-slate-300", borderHover: "hover:border-slate-500/30" },
            { title: "Real-time Dashboard", desc: "Monitor all repositories, track issues, and see review trends at a glance.", icon: Eye, color: "text-cyan-400", borderHover: "hover:border-cyan-500/30" },
            { title: "Access Control", desc: "Role-based access with admin controls for team settings and configurations.", icon: Lock, color: "text-orange-400", borderHover: "hover:border-orange-500/30" },
            { title: "Fast Analysis", desc: "Reviews complete in seconds, not hours. No impact on your CI/CD pipeline.", icon: Clock, color: "text-pink-400", borderHover: "hover:border-pink-500/30" },
          ].map((f) => (
            <div key={f.title} className={`reveal rounded-xl border border-slate-800 bg-slate-900/50 p-6 card-glow ${f.borderHover} transition-colors`}>
              <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center mb-4">
                <f.icon className={f.color} size={20} />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tool pipeline ─── */}
      <section className="py-20 bg-slate-900/20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 md:p-12">
            <h3 className="text-2xl font-bold text-center mb-10">Analysis Pipeline</h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
              {[
                { label: "Pull Request", icon: GitPullRequest, color: "text-green-400 border-green-500/30 bg-green-500/5" },
                { label: "Bandit Scan", icon: Shield, color: "text-red-400 border-red-500/30 bg-red-500/5" },
                { label: "Flake8 Lint", icon: Code2, color: "text-blue-400 border-blue-500/30 bg-blue-500/5" },
                { label: "Radon Metrics", icon: Star, color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5" },
                { label: "AI Review", icon: Sparkles, color: "text-purple-400 border-purple-500/30 bg-purple-500/5" },
                { label: "Fix Suggestions", icon: CheckCircle2, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-4 md:gap-0">
                  <div className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border ${step.color} transition-transform hover:scale-105`}>
                    <step.icon size={22} />
                    <span className="text-xs font-medium text-slate-300 whitespace-nowrap">{step.label}</span>
                  </div>
                  {i < 5 && (
                    <ArrowRight size={16} className="text-slate-600 mx-2 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Developers Say</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Trusted by developers who care about code quality.
          </p>
        </div>
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-6">
          {[
            {
              quote: "Gnosis caught a critical SQL injection in our auth module that our entire team missed. Saved us from a potential breach.",
              name: "Sarah Chen",
              role: "Senior Backend Engineer",
              avatar: "SC",
            },
            {
              quote: "We used to spend 2+ hours reviewing PRs. Now Gnosis does the heavy lifting and we focus on architecture decisions.",
              name: "Marcus Rivera",
              role: "Engineering Lead",
              avatar: "MR",
            },
            {
              quote: "The AI fix suggestions are incredibly accurate. It's like having a senior engineer review every single PR automatically.",
              name: "Priya Sharma",
              role: "Full Stack Developer",
              avatar: "PS",
            },
          ].map((t) => (
            <div key={t.name} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 card-glow flex flex-col">
              <MessageSquare className="text-purple-400/40 mb-4" size={24} />
              <p className="text-slate-300 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-800">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-24 bg-slate-900/20" ref={refFaq}>
        <div className="reveal max-w-3xl mx-auto px-6 text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-slate-400">Everything you need to know about Gnosis.</p>
        </div>
        <div className="reveal max-w-3xl mx-auto px-6 space-y-3">
          <FAQItem
            q="Is Gnosis really free?"
            a="Yes! Gnosis is completely free to use. Connect your repositories, get AI-powered reviews, and receive fix suggestions — all at no cost."
          />
          <FAQItem
            q="What languages does Gnosis support?"
            a="Currently Gnosis supports Python with Bandit, Flake8, and Radon analyzers, plus AI-powered review for any language in your pull requests."
          />
          <FAQItem
            q="How does the GitHub integration work?"
            a="Gnosis installs as a GitHub App on your repositories. When a pull request is opened or updated, it automatically triggers analysis and posts review comments directly on the PR."
          />
          <FAQItem
            q="Is my code safe?"
            a="Gnosis only accesses the files changed in a pull request. We do not store your source code permanently. Analysis runs in isolated environments and results are deleted after review."
          />
          <FAQItem
            q="Can I use Gnosis with private repositories?"
            a="Absolutely. Gnosis works with both public and private repositories. Your code privacy is always maintained."
          />
        </div>
      </section>

      {/* ─── Contact & Support ─── */}
      <section id="contact" className="py-24" ref={refContact}>
        <div className="reveal max-w-5xl mx-auto px-6 text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Contact &amp; Support</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Have questions or need help? Reach out &mdash; we&apos;re happy to assist.
          </p>
        </div>
        <div className="reveal max-w-3xl mx-auto px-6 grid sm:grid-cols-2 gap-8 stagger">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 flex flex-col items-center text-center card-glow">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5">
              <Mail className="text-purple-400" size={22} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Email Us</h3>
            <p className="text-slate-400 text-sm mb-4">We typically respond within 24 hours.</p>
            <a
              href="mailto:cheifathmohammed@gmail.com"
              className="text-purple-400 hover:text-purple-300 text-sm font-medium transition"
            >
              cheifathmohammed@gmail.com
            </a>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 flex flex-col items-center text-center card-glow">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5">
              <Phone className="text-purple-400" size={22} />
            </div>
            <h3 className="text-lg font-semibold mb-2">Call Us</h3>
            <p className="text-slate-400 text-sm mb-4">Available Mon&ndash;Fri, 9 AM &ndash; 6 PM EST.</p>
            <a
              href="tel:+14155550132"
              className="text-purple-400 hover:text-purple-300 text-sm font-medium transition"
            >
              +1 (415) 555-0132
            </a>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-20" ref={refCta}>
        <div className="reveal max-w-4xl mx-auto px-6">
          <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/30 via-slate-900 to-blue-900/20 p-10 md:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,.08)_0%,_transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Ship Better Code?
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto mb-8">
                Join developers who trust Gnosis to catch issues before they become problems.
                Free forever, set up in under a minute.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/login?mode=signup">
                  <Button size="lg" className="bg-purple-600 hover:bg-purple-500 text-base px-10 shadow-xl shadow-purple-600/20 hover:shadow-purple-600/40 transition-all">
                    <Github size={18} /> Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-800/60 bg-slate-900/30 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <Shield className="text-purple-400" size={20} />
              <span className="font-bold">GNOSIS</span>
              <span className="text-slate-600 text-sm ml-2">&copy; 2026 All rights reserved.</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              <a href="#features" className="hover:text-slate-300 transition">Features</a>
              <a href="#how-it-works" className="hover:text-slate-300 transition">How it works</a>
              <a href="#faq" className="hover:text-slate-300 transition">FAQ</a>
              <a href="#contact" className="hover:text-slate-300 transition">Contact</a>
              <Link href="/login" className="hover:text-slate-300 transition">Sign in</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <p>Built with AI-powered static analysis for modern development teams.</p>
            <div className="flex items-center gap-4">
              <a href="mailto:cheifathmohammed@gmail.com" className="hover:text-slate-400 transition">cheifathmohammed@gmail.com</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
