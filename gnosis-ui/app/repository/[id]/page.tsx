"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api/client"
import {
  FolderGit2,
  GitPullRequest,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
  CircleDashed,
} from "lucide-react"

type PullRequest = {
  id: number
  pr_number: number
  title: string
  author?: string
  status: "pending" | "processing" | "completed" | "failed"
  created_at: string
}

type RepositoryDetail = {
  id: number
  name: string
  installation_id: string
  prs: PullRequest[]
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; icon: typeof CheckCircle2 }> = {
  completed:  { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", icon: CheckCircle2 },
  failed:     { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-400",     icon: XCircle },
  processing: { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400",   icon: Timer },
  pending:    { bg: "bg-slate-500/10",   text: "text-slate-400",   dot: "bg-slate-400",   icon: CircleDashed },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function RepositoryPage() {
  const params = useParams()
  const [repo, setRepo] = useState<RepositoryDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return
    api.get(`/repositories/${params.id}`)
      .then(res => setRepo(res.data))
      .catch(() => setError("Repository not found"))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-fade-in glass-card rounded-2xl p-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="text-red-400" size={28} />
        </div>
        <p className="text-red-400 text-sm font-medium">{error}</p>
      </div>
    )
  }

  if (!repo) return null

  const statusCounts = {
    completed: repo.prs.filter(p => p.status === "completed").length,
    failed: repo.prs.filter(p => p.status === "failed").length,
    processing: repo.prs.filter(p => p.status === "processing").length,
    pending: repo.prs.filter(p => p.status === "pending").length,
  }

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/repositories"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Repositories
      </Link>

      {/* Repository header card */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
            <FolderGit2 size={22} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{repo.name}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {repo.prs.length} pull request{repo.prs.length !== 1 ? "s" : ""} analyzed
            </p>
          </div>
        </div>

        {/* Status summary chips */}
        {repo.prs.length > 0 && (
          <div className="flex items-center gap-2 mt-5 pt-5 border-t border-white/[0.05] flex-wrap">
            {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => {
              if (count === 0) return null
              const cfg = statusConfig[status] || statusConfig.pending
              return (
                <div
                  key={status}
                  className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium ${cfg.bg} ${cfg.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {count} {status}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pull requests section */}
      <div className="flex items-center gap-2 mb-4">
        <GitPullRequest size={16} className="text-purple-400" />
        <h2 className="text-lg font-semibold text-white">Pull Requests</h2>
        <span className="text-[11px] text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-md ml-1">
          {repo.prs.length}
        </span>
      </div>

      {repo.prs.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <GitPullRequest className="text-slate-600" size={28} />
          </div>
          <p className="text-slate-400 text-sm font-medium">No pull requests analyzed yet</p>
          <p className="text-slate-500 text-xs mt-1">PRs will appear here once they are analyzed</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl divide-y divide-white/[0.04]">
          {repo.prs.map((pr, i) => {
            const config = statusConfig[pr.status] || statusConfig.pending
            const StatusIcon = config.icon
            return (
              <Link href={`/pull-request/${pr.id}`} key={pr.id}>
                <div
                  className="group flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all duration-200 cursor-pointer first:rounded-t-2xl last:rounded-b-2xl animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center shrink-0 group-hover:bg-purple-500/10 transition-colors">
                      <GitPullRequest size={16} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono text-slate-500">#{pr.pr_number}</span>
                        <span className="text-[13px] font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                          {pr.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        {pr.author && (
                          <span className="flex items-center gap-1">
                            {pr.author}
                          </span>
                        )}
                        {pr.created_at && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {timeAgo(pr.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium ${config.bg} ${config.text}`}>
                      <StatusIcon size={12} />
                      {pr.status}
                    </span>
                    <ArrowRight size={14} className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
