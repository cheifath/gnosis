"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api/client"
import { useAuth } from "@/lib/auth-context"
import StatCard from "@/components/dashboard/stat-card"
import {
  GitPullRequest,
  AlertTriangle,
  FolderGit2,
  Wrench,
  ArrowRight,
  Clock,
  FileCode2,
  Loader2,
  Download,
  Shield,
} from "lucide-react"

type RecentPR = {
  id: number
  repository: string
  pr_number: number
  title: string
  author: string
  status: string
  files_count: number
  issues_count: number
  created_at: string
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  processing: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  pending: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ prs: 0, issues: 0, repositories: 0, fixes: 0 })
  const [recentPRs, setRecentPRs] = useState<RecentPR[]>([])
  const [hasInstallations, setHasInstallations] = useState(true)

  useEffect(() => {
    api.get("/dashboard")
      .then(res => {
        if (res.data.github_connected === false && user?.role !== "admin") {
          router.replace("/connect-github")
          return
        }
        setStats(res.data)
        setRecentPRs(res.data.recent_prs || [])
        setHasInstallations(res.data.has_installations ?? true)
        setLoading(false)
      })
      .catch(() => {
        setStats({ prs: 0, issues: 0, repositories: 0, fixes: 0 })
        setLoading(false)
      })
  }, [user, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back, <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">{user?.username || "Developer"}</span>
        </h1>
        <p className="text-sm text-slate-400">Here&apos;s what&apos;s happening across your repositories.</p>
      </div>

      {/* Install GitHub App Prompt */}
      {!hasInstallations && (
        <div className="mb-8 glass-card rounded-2xl p-6 border border-purple-500/20 bg-gradient-to-r from-purple-500/[0.05] to-violet-500/[0.05]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
              <Download size={22} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1">Install GNOSIS on your repositories</h3>
              <p className="text-sm text-slate-400 mb-4">
                Install the GNOSIS GitHub App to enable automatic AI-powered code reviews on every pull request. Works with your personal repos and organizations.
              </p>
              <Link
                href="/installations"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 group"
              >
                <Shield size={15} />
                Install GitHub App
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard title="PRs Analyzed" value={stats.prs} icon={GitPullRequest} color="purple" />
        <StatCard title="Issues Found" value={stats.issues} icon={AlertTriangle} color="red" />
        <StatCard title="Repositories" value={stats.repositories} icon={FolderGit2} color="blue" />
        <StatCard title="Fix Suggestions" value={stats.fixes} icon={Wrench} color="emerald" />
      </div>

      {/* Recent Pull Requests */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <GitPullRequest size={18} className="text-purple-400" />
              Recent Pull Requests
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest PR analysis results</p>
          </div>
          <Link href="/pull-request" className="flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors group">
            View all
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {recentPRs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <GitPullRequest className="text-slate-600" size={28} />
            </div>
            <p className="text-slate-400 text-sm font-medium">No pull requests analyzed yet</p>
            <p className="text-slate-500 text-xs mt-1">Connect a repository and open a PR to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPRs.map((pr, i) => {
              const config = statusConfig[pr.status] || statusConfig.pending
              return (
                <Link href={`/pull-request/${pr.id}`} key={pr.id}>
                  <div
                    className="group flex items-center justify-between rounded-xl p-4 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-all duration-200 cursor-pointer"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center shrink-0 group-hover:bg-purple-500/10 transition-colors">
                        <GitPullRequest size={16} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-mono text-slate-500">#{pr.pr_number}</span>
                          <span className="text-[13px] font-medium text-white truncate">{pr.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <FolderGit2 size={10} />
                            {pr.repository}
                          </span>
                          <span>by {pr.author}</span>
                          <span className="flex items-center gap-1">
                            <FileCode2 size={10} />
                            {pr.files_count} file{pr.files_count !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertTriangle size={10} />
                            {pr.issues_count} issue{pr.issues_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {pr.created_at && (
                        <span className="text-[11px] text-slate-600 flex items-center gap-1">
                          <Clock size={10} />
                          {timeAgo(pr.created_at)}
                        </span>
                      )}
                      <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium ${config.bg} ${config.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {pr.status}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}