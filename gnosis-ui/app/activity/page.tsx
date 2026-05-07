"use client"

import { useEffect, useState, useMemo } from "react"
import { api } from "@/lib/api/client"
import {
  Activity,
  GitPullRequest,
  AlertTriangle,
  Wrench,
  FileText,
  Loader2,
  FolderGit2,
  Clock,
  ChevronRight,
} from "lucide-react"

type ActivityEvent = {
  type: "pr_analyzed" | "issue_detected" | "fix_suggested" | "audit"
  message: string
  repository?: string
  status?: string
  severity?: string
  timestamp: string
}

type TypeFilter = "all" | "pr_analyzed" | "issue_detected" | "fix_suggested" | "audit"

const typeConfig: Record<string, { icon: typeof Activity; color: string; bg: string; label: string; gradient: string; ring: string }> = {
  pr_analyzed: {
    icon: GitPullRequest,
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    label: "PR Analyzed",
    gradient: "from-blue-500 to-cyan-500",
    ring: "ring-blue-500/20",
  },
  issue_detected: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    label: "Issue Detected",
    gradient: "from-amber-500 to-orange-500",
    ring: "ring-amber-500/20",
  },
  fix_suggested: {
    icon: Wrench,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    label: "Fix Suggested",
    gradient: "from-emerald-500 to-green-500",
    ring: "ring-emerald-500/20",
  },
  audit: {
    icon: FileText,
    color: "text-slate-400",
    bg: "bg-slate-500/15",
    label: "System Event",
    gradient: "from-slate-500 to-slate-400",
    ring: "ring-slate-500/20",
  },
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

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TypeFilter>("all")

  useEffect(() => {
    api.get("/activity/")
      .then(res => setEvents(res.data.events))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of events) {
      map[e.type] = (map[e.type] || 0) + 1
    }
    return map
  }, [events])

  const filtered = useMemo(() => {
    if (filter === "all") return events
    return events.filter(e => e.type === filter)
  }, [events, filter])

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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
            <Activity size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Activity</h1>
            <p className="text-sm text-slate-400">
              {filtered.length} event{filtered.length !== 1 ? "s" : ""} in your timeline
            </p>
          </div>
        </div>
      </div>

      {/* Summary filter cards */}
      {events.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["pr_analyzed", "issue_detected", "fix_suggested", "audit"] as const).map(type => {
            const config = typeConfig[type]
            const count = counts[type] || 0
            if (count === 0) return null
            const Icon = config.icon
            const isActive = filter === type
            return (
              <button
                key={type}
                onClick={() => setFilter(filter === type ? "all" : type)}
                className={`glass-card rounded-xl p-4 text-left transition-all duration-300 ${
                  isActive ? `ring-2 ${config.ring}` : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                    <Icon size={14} className={config.color} />
                  </div>
                  <span className={`text-xl font-bold ${config.color}`}>{count}</span>
                </div>
                <p className="text-[11px] font-medium text-slate-400">{config.label}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Events list */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-6">
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <Activity className="text-slate-600" size={28} />
            </div>
            <p className="text-slate-400 text-sm font-medium">No activity yet</p>
            <p className="text-slate-500 text-xs mt-1">Events will appear here once PRs are analyzed</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event, i) => {
            const config = typeConfig[event.type] || typeConfig.audit
            const Icon = config.icon
            return (
              <div
                key={i}
                className="group relative glass-card rounded-xl p-4 animate-slide-up"
                style={{ animationDelay: `${Math.min(i, 15) * 40}ms` }}
              >
                {/* Accent line on left */}
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
                        <span className={`text-[10px] font-bold ${config.color} uppercase tracking-widest`}>
                          {config.label}
                        </span>
                        <p className="text-[13px] text-slate-200 mt-0.5 break-words leading-relaxed group-hover:text-white transition-colors">
                          {event.message}
                        </p>

                        {/* Meta row */}
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                          {event.repository && (
                            <span className="flex items-center gap-1.5 font-mono">
                              <FolderGit2 size={11} className="text-slate-600" />
                              {event.repository}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Clock size={11} className="text-slate-600" />
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Right side: badges + arrow */}
                      <div className="flex items-center gap-2 shrink-0 mt-1">
                        {/* Status/severity badge */}
                        {event.status && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                            event.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                              : event.status === "failed"
                              ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                              : event.status === "processing"
                              ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                              : "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              event.status === "completed" ? "bg-emerald-400"
                              : event.status === "failed" ? "bg-red-400"
                              : event.status === "processing" ? "bg-amber-400"
                              : "bg-slate-400"
                            }`} />
                            {event.status}
                          </span>
                        )}
                        {event.severity && (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium ${
                            event.severity === "HIGH"
                              ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                              : event.severity === "MEDIUM"
                              ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                          }`}>
                            {event.severity.toLowerCase()}
                          </span>
                        )}
                        <ChevronRight size={14} className="text-slate-700 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
