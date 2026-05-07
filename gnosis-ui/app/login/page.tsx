"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { apiGetGitHubOAuthUrl } from "@/lib/api/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Github,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Lock,
  User,
  Sparkles,
  ScanSearch,
  Wrench,
  ArrowRight,
  ArrowLeft,
} from "lucide-react"

const features = [
  {
    icon: ScanSearch,
    title: "Vulnerability Detection",
    desc: "Catch security issues before they ship",
    color: "from-purple-500 to-violet-600",
    glow: "purple",
  },
  {
    icon: Sparkles,
    title: "AI Code Reviews",
    desc: "Intelligent analysis on every pull request",
    color: "from-blue-500 to-cyan-500",
    glow: "blue",
  },
  {
    icon: Wrench,
    title: "Auto Fix Suggestions",
    desc: "One-click fixes with AI-generated patches",
    color: "from-emerald-500 to-green-500",
    glow: "emerald",
  },
  {
    icon: Github,
    title: "GitHub Integration",
    desc: "Native GitHub App with seamless workflow",
    color: "from-orange-500 to-amber-500",
    glow: "orange",
  },
]

export default function LoginPage() {
  const { login, signup } = useAuth()
  const searchParams = useSearchParams()
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login"
  const [mode, setMode] = useState<"login" | "signup">(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }
    try {
      if (mode === "signup") {
        await signup(username, email, password)
      } else {
        await login(email, password)
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleGitHub = async () => {
    try {
      const url = await apiGetGitHubOAuthUrl()
      window.location.href = url
    } catch {
      setError("GitHub OAuth not configured. Use email/password instead.")
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-950 overflow-x-hidden relative">
      {/* Back to landing page */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Home
      </Link>

      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-10 lg:sticky lg:top-0 lg:h-screen">
        {/* Animated background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/80 via-slate-950 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.15),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(59,130,246,0.1),_transparent_50%)]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-32 right-16 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-violet-500/5 rounded-full blur-2xl animate-pulse-glow" />

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-xl blur-xl" />
              <div className="relative bg-gradient-to-br from-purple-500 to-violet-600 p-2.5 rounded-xl">
                <Shield className="text-white" size={28} />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">GNOSIS</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold leading-[1.1] mb-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <span className="text-white">Ship secure code</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              with confidence
            </span>
          </h1>

          <p className="text-slate-400 text-base leading-relaxed mb-8 max-w-md animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            AI-powered pull request intelligence that catches vulnerabilities, reviews code, and suggests fixes — automatically.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-xl p-3 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 animate-fade-in-up cursor-default"
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              >
                <div className={`inline-flex p-1.5 rounded-lg bg-gradient-to-br ${f.color} mb-2`}>
                  <f.icon size={16} className="text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="mt-6 flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: "0.7s" }}>
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-slate-950 bg-gradient-to-br from-slate-700 to-slate-800"
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Trusted by developers worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Right side - auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative min-h-screen">
        {/* Subtle background glow for form side */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center animate-fade-in-up">
            <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-2 rounded-xl">
              <Shield className="text-white" size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">GNOSIS</span>
          </div>

          {/* Mode toggle tabs */}
          <div className="flex bg-slate-900/50 rounded-xl p-1 mb-6 border border-slate-800/50 animate-fade-in-up">
            <button
              type="button"
              onClick={() => { setMode("login"); setError("") }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                mode === "login"
                  ? "bg-slate-800 text-white shadow-lg shadow-slate-900/50"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setError("") }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                mode === "signup"
                  ? "bg-slate-800 text-white shadow-lg shadow-slate-900/50"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Create account
            </button>
          </div>

          {/* Header */}
          <div className="mb-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-2xl font-bold text-white mb-2">
              {mode === "login" ? "Welcome back" : "Get started"}
            </h2>
            <p className="text-slate-500 text-sm">
              {mode === "login"
                ? "Enter your credentials to access your account"
                : "Create your account and start reviewing code"}
            </p>
          </div>

          {/* GitHub OAuth */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <button
              type="button"
              onClick={handleGitHub}
              className="w-full flex items-center justify-center gap-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/[0.15] text-white rounded-xl h-11 text-sm font-medium transition-all duration-300 group"
            >
              <Github size={18} className="group-hover:scale-110 transition-transform" />
              Continue with GitHub
              <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800/60" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-950 px-4 text-slate-600 uppercase tracking-widest">or</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/[0.07] border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm animate-fade-in-up">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">
                  Username
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-400 transition-colors" size={16} />
                  <Input
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-white/[0.03] border-white/[0.08] focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20 pl-10 h-11 rounded-xl text-white placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-400">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-400 transition-colors" size={16} />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20 pl-10 h-11 rounded-xl text-white placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-400">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-400 transition-colors" size={16} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/[0.03] border-white/[0.08] focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20 pl-10 pr-11 h-11 rounded-xl text-white placeholder:text-slate-600"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === "signup" && (
                <p className="text-xs text-slate-600 mt-1">Must be at least 8 characters</p>
              )}
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-400">
                  Confirm Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-purple-400 transition-colors" size={16} />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white/[0.03] border-white/[0.08] focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20 pl-10 pr-11 h-11 rounded-xl text-white placeholder:text-slate-600"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white h-11 rounded-xl font-medium text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 mt-1"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : null}
              {mode === "login" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight size={16} className="ml-1" />}
            </Button>
          </form>

          {/* Footer text */}
          <p className="text-center text-slate-600 text-xs mt-5 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => { setMode("signup"); setError("") }}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError("") }}
                  className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          {/* Terms */}
          <p className="text-center text-slate-700 text-[11px] mt-3 leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
