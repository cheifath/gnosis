"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiGetGitHubOAuthUrl } from "@/lib/api/auth"
import {
  Github,
  Loader2,
  Shield,
  ArrowRight,
  GitPullRequest,
  FolderGit2,
  AlertTriangle,
  CheckCircle2,
  LogOut,
} from "lucide-react"

const steps = [
  {
    icon: Github,
    title: "Authorize Gnosis",
    desc: "Grant read access to your repositories",
    color: "from-slate-600 to-slate-700",
  },
  {
    icon: FolderGit2,
    title: "Select Repositories",
    desc: "Choose which repos to analyze",
    color: "from-purple-500 to-violet-600",
  },
  {
    icon: GitPullRequest,
    title: "Auto-Review PRs",
    desc: "Get AI reviews on every pull request",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: AlertTriangle,
    title: "Find Vulnerabilities",
    desc: "Catch security issues automatically",
    color: "from-emerald-500 to-green-500",
  },
]

export default function ConnectGitHub() {
  const { user, loading, logout } = useAuth()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState("")

  const handleConnect = async () => {
    setConnecting(true)
    setError("")
    try {
      const url = await apiGetGitHubOAuthUrl("connect")
      window.location.href = url
    } catch {
      setError("GitHub OAuth is not configured. Please contact your administrator.")
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    )
  }

  if (user?.github_connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.08),_transparent_60%)]" />
        <div className="relative z-10 text-center animate-fade-in-up">
          <div className="relative mx-auto mb-6 w-20 h-20">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl animate-pulse-glow" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <CheckCircle2 className="text-white" size={36} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">GitHub Connected</h1>
          <p className="text-slate-400 mb-8 text-base">
            Linked as <span className="text-white font-semibold">@{user.github_login}</span>
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white px-8 py-3.5 rounded-xl font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 group"
          >
            Go to Dashboard
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-slate-950 overflow-hidden relative">
      {/* Logout button — top right */}
      <button
        onClick={logout}
        className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200 group"
      >
        <LogOut size={14} className="group-hover:text-red-400 transition-colors" />
        Sign out
      </button>

      {/* Left side — branding / how it works */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-10">
        {/* Background layers */}
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

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
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
            <span className="text-white">One more step to</span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              secure your code
            </span>
          </h1>

          <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-md animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Connect your GitHub account so Gnosis can analyze your repositories and automatically review every pull request.
          </p>

          {/* How it works steps */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              How it works
            </p>
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="group flex items-center gap-4 bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 animate-fade-in-up cursor-default"
                style={{ animationDelay: `${0.35 + i * 0.1}s` }}
              >
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[11px] font-bold text-slate-600 w-5 text-center">{i + 1}</span>
                  <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${step.color}`}>
                    <step.icon size={16} className="text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-0.5">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — connect action */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center animate-fade-in-up">
            <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-2 rounded-xl">
              <Shield className="text-white" size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">GNOSIS</span>
          </div>

          {/* GitHub icon */}
          <div className="flex justify-center mb-8 animate-fade-in-up">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/15 rounded-2xl blur-xl animate-pulse-glow" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/[0.08] flex items-center justify-center shadow-2xl">
                <Github className="text-white" size={36} />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your GitHub</h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
              Link your GitHub account to unlock AI-powered code reviews, vulnerability detection, and automated fix suggestions.
            </p>
          </div>

          {/* Permissions info */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">What we request</p>
            <div className="space-y-2.5">
              {[
                "Read access to your repositories",
                "Read access to pull requests & issues",
                "Webhook events for new PRs",
              ].map((perm) => (
                <div key={perm} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={10} className="text-emerald-400" />
                  </div>
                  <span className="text-[13px] text-slate-300">{perm}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/[0.07] border border-red-500/20 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm animate-fade-in-up">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              {error}
            </div>
          )}

          {/* Connect button */}
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:from-purple-600/50 disabled:to-violet-600/50 text-white rounded-xl h-12 text-sm font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 group animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            {connecting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Github size={18} className="group-hover:scale-110 transition-transform" />
            )}
            {connecting ? "Connecting to GitHub..." : "Connect GitHub Account"}
            {!connecting && (
              <ArrowRight size={14} className="text-purple-200 group-hover:translate-x-0.5 transition-all" />
            )}
          </button>

          {/* Security note */}
          <div className="flex items-center justify-center gap-2 mt-5 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
            <Shield size={12} className="text-slate-600" />
            <p className="text-xs text-slate-600">
              We never store your code. Your data stays on GitHub.
            </p>
          </div>

          {/* Skip link for context */}
          <p className="text-center text-slate-700 text-[11px] mt-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            Need help?{" "}
            <a href="mailto:support@gnosis.dev" className="text-purple-400/70 hover:text-purple-400 transition-colors">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
