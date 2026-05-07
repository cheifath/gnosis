"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api/client"
import {
  GitPullRequest,
  FolderGit2,
  User,
  Loader2,
  ArrowRight,
} from "lucide-react"

type PullRequest = {
  id: number
  repository: string
  pr_number: number
  title: string
  author: string
  state: string
  status: "pending" | "processing" | "completed" | "failed"
  created_at: string
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  processing: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  pending: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
}

export default function PullRequests() {
  const [prs, setPRs] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/prs")
      .then(res => setPRs(res.data.results || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

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
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center">
            <GitPullRequest size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Pull Requests</h1>
            <p className="text-sm text-slate-400">{prs.length} total pull request{prs.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {prs.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <GitPullRequest className="text-slate-600" size={28} />
          </div>
          <p className="text-slate-400 text-sm font-medium">No pull requests analyzed yet</p>
          <p className="text-slate-500 text-xs mt-1">PRs will appear here once they are analyzed</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl divide-y divide-white/[0.04]">
          {prs.map((pr, i) => {
            const config = statusConfig[pr.status] || statusConfig.pending
            return (
              <Link href={`/pull-request/${pr.id}`} key={pr.id}>
                <div
                  className="group flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all duration-200 cursor-pointer first:rounded-t-2xl last:rounded-b-2xl"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center shrink-0 group-hover:bg-purple-500/10 transition-colors">
                      <GitPullRequest size={16} className="text-slate-400 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-mono text-slate-500">#{pr.pr_number}</span>
                        <span className="text-[13px] font-medium text-white truncate group-hover:text-purple-300 transition-colors">{pr.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <FolderGit2 size={10} />
                          {pr.repository}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {pr.author}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium ${config.bg} ${config.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
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
