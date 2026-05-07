"use client"

import { useEffect, useState, useMemo } from "react"
import AdminLayout from "@/components/layout/admin-layout"
import {
  apiAdminListPRs,
  apiAdminRetriggerPR,
  AdminPR,
} from "@/lib/api/admin"
import {
  GitPullRequest,
  Loader2,
  Search,
  RefreshCw,
  Download,
  FileJson,
  Filter,
  FolderGit2,
  Clock,
  FileCode2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gauge,
} from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api/client"

const statusConfig: Record<string, { bg: string; text: string; dot: string; icon: typeof CheckCircle2 }> = {
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", icon: CheckCircle2 },
  failed: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400", icon: XCircle },
  processing: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", icon: Loader2 },
  pending: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400", icon: Clock },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AdminPRsPage() {
  const [prs, setPrs] = useState<AdminPR[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [retriggering, setRetriggering] = useState<number | null>(null)

  const loadPRs = (params?: { status?: string; search?: string }) => {
    setLoading(true)
    apiAdminListPRs(params)
      .then((data) => setPrs(data.results))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPRs()
  }, [])

  const handleFilter = () => {
    const params: { status?: string; search?: string } = {}
    if (statusFilter) params.status = statusFilter
    if (search) params.search = search
    loadPRs(params)
  }

  const handleRetrigger = async (prId: number) => {
    setRetriggering(prId)
    try {
      await apiAdminRetriggerPR(prId)
      loadPRs()
    } catch (e) {
      console.error(e)
    } finally {
      setRetriggering(null)
    }
  }

  const handleExportJson = async (prId: number) => {
    try {
      const res = await api.get(`/prs/${prId}/export/`)
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `pr_${prId}_export.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }

  const handleDownloadFixes = (prId: number) => {
    window.open(`http://127.0.0.1:8000/api/prs/${prId}/download-fixes/`, "_blank")
  }

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const pr of prs) {
      map[pr.status] = (map[pr.status] || 0) + 1
    }
    return map
  }, [prs])

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
              <GitPullRequest size={20} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">PR Monitoring</h1>
              <p className="text-sm text-slate-400">View and manage all pull request analyses</p>
            </div>
          </div>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["completed", "failed", "processing", "pending"] as const).map(status => {
            const config = statusConfig[status]
            const count = statusCounts[status] || 0
            const isActive = statusFilter === status
            return (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(statusFilter === status ? "" : status)
                  setTimeout(handleFilter, 0)
                }}
                className={`glass-card rounded-xl p-4 text-left transition-all duration-300 ${
                  isActive ? `ring-2 ring-${status === "completed" ? "emerald" : status === "failed" ? "red" : status === "processing" ? "amber" : "slate"}-500/30` : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                    <config.icon size={14} className={config.text} />
                  </div>
                  <span className={`text-xl font-bold ${config.text}`}>{count}</span>
                </div>
                <p className="text-[11px] font-medium text-slate-400 capitalize">{status}</p>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 glass-card rounded-xl px-4 py-2.5 w-80 ring-1 ring-white/[0.06] focus-within:ring-red-500/30 transition-all">
            <Search size={16} className="text-slate-500" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFilter()}
              className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 w-full"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-card rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none ring-1 ring-white/[0.06] bg-transparent appearance-none cursor-pointer"
          >
            <option value="" className="bg-slate-800">All Statuses</option>
            <option value="completed" className="bg-slate-800">Completed</option>
            <option value="failed" className="bg-slate-800">Failed</option>
            <option value="processing" className="bg-slate-800">Processing</option>
            <option value="pending" className="bg-slate-800">Pending</option>
          </select>

          <button
            onClick={handleFilter}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all ring-1 ring-white/[0.06] hover:ring-white/[0.1]"
          >
            <Filter size={14} />
            Apply
          </button>
        </div>

        {/* PRs List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-red-400" size={32} />
          </div>
        ) : prs.length === 0 ? (
          <div className="glass-card rounded-2xl p-6">
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <GitPullRequest className="text-slate-600" size={28} />
              </div>
              <p className="text-slate-400 text-sm font-medium">No pull requests found</p>
              <p className="text-slate-500 text-xs mt-1">Adjust filters or wait for new PR analyses</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {prs.map((pr, i) => {
              const config = statusConfig[pr.status] || statusConfig.pending
              return (
                <div
                  key={pr.id}
                  className="group relative glass-card rounded-xl p-4 animate-slide-up hover:ring-1 hover:ring-white/[0.06] transition-all duration-200"
                  style={{ animationDelay: `${Math.min(i, 15) * 40}ms` }}
                >
                  {/* Accent line */}
                  <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b ${
                    pr.status === "completed" ? "from-emerald-500 to-green-500" :
                    pr.status === "failed" ? "from-red-500 to-orange-500" :
                    pr.status === "processing" ? "from-amber-500 to-orange-500" :
                    "from-slate-500 to-slate-400"
                  } opacity-40 group-hover:opacity-100 transition-opacity`} />

                  <div className="flex items-center justify-between pl-3">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 ring-1 ring-white/[0.06] group-hover:ring-2 transition-all`}>
                        <GitPullRequest size={16} className={config.text} />
                      </div>

                      {/* PR info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link
                            href={`/pull-request/${pr.id}`}
                            className="text-[13px] font-medium text-white hover:text-purple-300 transition-colors truncate"
                          >
                            <span className="font-mono text-slate-500 mr-1.5">#{pr.pr_number}</span>
                            {pr.title}
                          </Link>
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

                    {/* Right side */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Confidence */}
                      {pr.confidence !== null && (
                        <div className="hidden lg:flex items-center gap-1.5">
                          <Gauge size={12} className="text-slate-500" />
                          <span className={`text-[12px] font-semibold ${
                            pr.confidence >= 0.8 ? "text-emerald-400" :
                            pr.confidence >= 0.5 ? "text-amber-400" :
                            "text-red-400"
                          }`}>
                            {(pr.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}

                      {/* Time */}
                      {pr.created_at && (
                        <span className="hidden lg:flex items-center gap-1 text-[11px] text-slate-600">
                          <Clock size={10} />
                          {timeAgo(pr.created_at)}
                        </span>
                      )}

                      {/* Status badge */}
                      <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium ${config.bg} ${config.text} ring-1 ring-white/[0.06]`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {pr.status}
                      </span>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={() => handleRetrigger(pr.id)}
                          disabled={retriggering === pr.id}
                          title="Re-run analysis"
                          className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-slate-500 hover:text-white disabled:opacity-50"
                        >
                          {retriggering === pr.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => handleExportJson(pr.id)}
                          title="Export JSON"
                          className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-slate-500 hover:text-white"
                        >
                          <FileJson size={14} />
                        </button>
                        {pr.status === "completed" && (
                          <button
                            onClick={() => handleDownloadFixes(pr.id)}
                            title="Download fixes"
                            className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-slate-500 hover:text-white"
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
