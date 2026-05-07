"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api/client"
import {
  FolderGit2,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
} from "lucide-react"

type Repository = {
  id: number
  name: string
  total_prs: number
  completed_prs: number
  failed_prs: number
  created_at: string
}

export default function Repositories() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"analyzed" | "all">("analyzed")

  useEffect(() => {
    api.get("/repositories")
      .then(res => setRepos(res.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const analyzedRepos = repos.filter(r => r.total_prs > 0)
  const displayedRepos = filter === "analyzed" ? analyzedRepos : repos

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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
            <FolderGit2 size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Repositories</h1>
            <p className="text-sm text-slate-400">{repos.length} connected repositor{repos.length !== 1 ? "ies" : "y"}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        {repos.length > 0 && (
          <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
            <button
              onClick={() => setFilter("analyzed")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                filter === "analyzed"
                  ? "bg-purple-500/15 text-purple-400 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <CheckCircle2 size={13} />
              Analyzed
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md ${
                filter === "analyzed" ? "bg-purple-500/20 text-purple-300" : "bg-white/[0.06] text-slate-500"
              }`}>
                {analyzedRepos.length}
              </span>
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                filter === "all"
                  ? "bg-purple-500/15 text-purple-400 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <FolderGit2 size={13} />
              All
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md ${
                filter === "all" ? "bg-purple-500/20 text-purple-300" : "bg-white/[0.06] text-slate-500"
              }`}>
                {repos.length}
              </span>
            </button>
          </div>
        )}
      </div>

      {repos.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <FolderGit2 className="text-slate-600" size={28} />
          </div>
          <p className="text-slate-400 text-sm font-medium">No repositories connected</p>
          <p className="text-slate-500 text-xs mt-1">Connect your GitHub account to see repositories here</p>
        </div>
      ) : displayedRepos.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-slate-600" size={28} />
          </div>
          <p className="text-slate-400 text-sm font-medium">No analyzed repositories yet</p>
          <p className="text-slate-500 text-xs mt-1">Repositories will appear here once GNOSIS analyzes a pull request</p>
          <button
            onClick={() => setFilter("all")}
            className="mt-4 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            View all {repos.length} repositories &rarr;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedRepos.map((repo, i) => {
            const completionRate = repo.total_prs > 0 ? Math.round((repo.completed_prs / repo.total_prs) * 100) : 0
            return (
              <Link href={`/repository/${repo.id}`} key={repo.id}>
                <div
                  className="glass-card rounded-2xl p-6 cursor-pointer group"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center ring-1 ring-white/[0.06] group-hover:ring-purple-500/20 transition-all">
                        <FolderGit2 size={18} className="text-slate-300 group-hover:text-purple-300 transition-colors" />
                      </div>
                      <div>
                        <h2 className="text-[15px] font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {repo.name}
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">Connected repository</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5">
                      <GitPullRequest size={13} className="text-slate-500" />
                      <span className="text-[12px] text-slate-400">{repo.total_prs} PRs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      <span className="text-[12px] text-emerald-400">{repo.completed_prs} completed</span>
                    </div>
                    {repo.failed_prs > 0 && (
                      <div className="flex items-center gap-1.5">
                        <XCircle size={13} className="text-red-500" />
                        <span className="text-[12px] text-red-400">{repo.failed_prs} failed</span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-slate-500">Completion</span>
                      <span className="text-[11px] font-semibold text-white">{completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-800/60 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
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