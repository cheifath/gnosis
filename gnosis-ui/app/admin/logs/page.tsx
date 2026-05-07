"use client"

import { Fragment, useEffect, useState, useMemo } from "react"
import AdminLayout from "@/components/layout/admin-layout"
import { apiAdminListLogs, AdminLog } from "@/lib/api/admin"
import {
  ScrollText,
  Loader2,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  UserCircle,
  GitPullRequest,
  Settings,
  AlertTriangle,
  Shield,
  ChevronRight,
  Calendar,
} from "lucide-react"

const typeConfig: Record<string, { icon: typeof ScrollText; color: string; bg: string; gradient: string; ring: string }> = {
  pr: {
    icon: GitPullRequest,
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    gradient: "from-blue-500 to-cyan-500",
    ring: "ring-blue-500/20",
  },
  user: {
    icon: UserCircle,
    color: "text-purple-400",
    bg: "bg-purple-500/15",
    gradient: "from-purple-500 to-indigo-500",
    ring: "ring-purple-500/20",
  },
  settings: {
    icon: Settings,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    gradient: "from-amber-500 to-orange-500",
    ring: "ring-amber-500/20",
  },
  error: {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/15",
    gradient: "from-red-500 to-orange-500",
    ring: "ring-red-500/20",
  },
  default: {
    icon: ScrollText,
    color: "text-slate-400",
    bg: "bg-slate-500/15",
    gradient: "from-slate-500 to-slate-400",
    ring: "ring-slate-500/20",
  },
}

function getTypeConfig(actionType: string) {
  if (actionType.includes("fail") || actionType.includes("error")) return typeConfig.error
  if (actionType.includes("trigger") || actionType.includes("PR") || actionType.includes("pr")) return typeConfig.pr
  if (actionType.includes("user") || actionType.includes("signup") || actionType.includes("login")) return typeConfig.user
  if (actionType.includes("settings") || actionType.includes("github") || actionType.includes("config")) return typeConfig.settings
  return typeConfig.default
}

function formatTimestamp(ts: string) {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedLog, setExpandedLog] = useState<number | null>(null)

  const loadLogs = (params?: {
    action_type?: string
    date_from?: string
    date_to?: string
  }) => {
    setLoading(true)
    apiAdminListLogs(params)
      .then((data) => setLogs(data.results))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    apiAdminListLogs()
      .then((data) => setLogs(data.results))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleFilter = () => {
    const params: { action_type?: string; date_from?: string; date_to?: string } = {}
    if (actionFilter) params.action_type = actionFilter
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    loadLogs(params)
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <ScrollText size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
              <p className="text-sm text-slate-400">
                {logs.length} event{logs.length !== 1 ? "s" : ""} tracked
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all ring-1 ring-white/[0.06] hover:ring-white/[0.1]"
          >
            <Download size={14} />
            Export JSON
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap mb-6">
          <div className="flex items-center gap-2 glass-card rounded-xl px-4 py-2.5 w-72 ring-1 ring-white/[0.06] focus-within:ring-red-500/30 transition-all">
            <Search size={16} className="text-slate-500" />
            <input
              type="text"
              placeholder="Filter by action type..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 glass-card rounded-xl px-3 py-2 ring-1 ring-white/[0.06]">
              <Calendar size={14} className="text-slate-500" />
              <span className="text-[11px] text-slate-500">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white focus:outline-none w-32"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 glass-card rounded-xl px-3 py-2 ring-1 ring-white/[0.06]">
              <Calendar size={14} className="text-slate-500" />
              <span className="text-[11px] text-slate-500">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white focus:outline-none w-32"
              />
            </div>
          </div>

          <button
            onClick={handleFilter}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all ring-1 ring-white/[0.06] hover:ring-white/[0.1]"
          >
            <Filter size={14} />
            Apply
          </button>
        </div>

        {/* Logs Timeline */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-red-400" size={32} />
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-card rounded-2xl p-6">
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <ScrollText className="text-slate-600" size={28} />
              </div>
              <p className="text-slate-400 text-sm font-medium">No audit logs found</p>
              <p className="text-slate-500 text-xs mt-1">System events will appear here as they occur</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => {
              const config = getTypeConfig(log.action_type)
              const Icon = config.icon
              const isExpanded = expandedLog === log.id
              return (
                <Fragment key={log.id}>
                  <div
                    className={`group relative glass-card rounded-xl p-4 cursor-pointer animate-slide-up transition-all duration-200 ${
                      isExpanded ? "ring-1 ring-white/[0.08]" : "hover:ring-1 hover:ring-white/[0.06]"
                    }`}
                    style={{ animationDelay: `${Math.min(i, 15) * 40}ms` }}
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    {/* Accent line */}
                    <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b ${config.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />

                    <div className="flex items-start gap-4 pl-3">
                      {/* Icon */}
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${config.bg} shrink-0 ring-1 ${config.ring} group-hover:ring-2 transition-all`}>
                        <Icon className={config.color} size={16} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${config.color} uppercase tracking-widest ${config.bg} ring-1 ${config.ring}`}>
                              {log.action_type}
                            </span>

                            {/* Meta row */}
                            <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <UserCircle size={11} className="text-slate-600" />
                                {log.actor}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock size={11} className="text-slate-600" />
                                {formatTimestamp(log.timestamp)}
                              </span>
                              <span className="text-[10px] text-slate-600">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Expand indicator */}
                          <div className="shrink-0 mt-1">
                            {isExpanded ? (
                              <ChevronUp size={14} className="text-slate-400" />
                            ) : (
                              <ChevronDown size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="glass-card rounded-xl p-4 ml-8 animate-slide-up ring-1 ring-white/[0.06]">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Event Details</p>
                      <pre className="text-[12px] text-slate-300 whitespace-pre-wrap overflow-auto max-h-64 font-mono leading-relaxed bg-slate-800/40 rounded-lg p-4">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
