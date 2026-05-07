"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import Link from "next/link"
import { api } from "@/lib/api/client"
import {
  AlertTriangle,
  Shield,
  FileCode2,
  Loader2,
  ArrowRight,
  Search,
  ChevronRight,
  Flame,
  CircleAlert,
  Info,
  GitPullRequest,
  FolderGit2,
  Wrench,
  SlidersHorizontal,
  X,
} from "lucide-react"

type Issue = {
  tool: string
  category: string
  severity: string
  line: number | null
  message: string
  filename: string
  pr_id: number
  pr_number: number
  pr_title: string
  repository: string
}

const severityConfig: Record<string, { bg: string; text: string; dot: string; ring: string; icon: typeof Flame; gradient: string }> = {
  HIGH:   { bg: "bg-red-500/10",   text: "text-red-400",   dot: "bg-red-400",   ring: "ring-red-500/20",   icon: Flame,       gradient: "from-red-500 to-orange-500" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", ring: "ring-amber-500/20", icon: CircleAlert,  gradient: "from-amber-500 to-yellow-500" },
  LOW:    { bg: "bg-blue-500/10",  text: "text-blue-400",  dot: "bg-blue-400",  ring: "ring-blue-500/20",  icon: Info,         gradient: "from-blue-500 to-cyan-500" },
  high:   { bg: "bg-red-500/10",   text: "text-red-400",   dot: "bg-red-400",   ring: "ring-red-500/20",   icon: Flame,       gradient: "from-red-500 to-orange-500" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", ring: "ring-amber-500/20", icon: CircleAlert,  gradient: "from-amber-500 to-yellow-500" },
  low:    { bg: "bg-blue-500/10",  text: "text-blue-400",  dot: "bg-blue-400",  ring: "ring-blue-500/20",  icon: Info,         gradient: "from-blue-500 to-cyan-500" },
}

type SeverityFilter = "all" | "HIGH" | "MEDIUM" | "LOW"
type GroupBy = "none" | "file" | "repository" | "tool"
type SortBy = "severity" | "file" | "tool" | "repository"

const severityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }

/* ── Animated counter ── */
function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const started = useRef(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const duration = 800
        const steps = 40
        const stepTime = duration / steps
        let current = 0
        const interval = setInterval(() => {
          current += Math.ceil(value / steps)
          if (current >= value) { current = value; clearInterval(interval) }
          setDisplay(current)
        }, stepTime)
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return <span ref={ref}>{display}</span>
}

/* ── Severity mini-bar ── */
function SeverityBar({ high, medium, low }: { high: number; medium: number; low: number }) {
  const total = high + medium + low
  if (total === 0) return null
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04] w-full">
      {high > 0 && (
        <div
          className="bg-gradient-to-r from-red-500 to-red-400 transition-all duration-700 ease-out"
          style={{ width: `${(high / total) * 100}%` }}
        />
      )}
      {medium > 0 && (
        <div
          className="bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700 ease-out"
          style={{ width: `${(medium / total) * 100}%` }}
        />
      )}
      {low > 0 && (
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700 ease-out"
          style={{ width: `${(low / total) * 100}%` }}
        />
      )}
    </div>
  )
}

export default function Issues() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [filter, setFilter] = useState<SeverityFilter>("all")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [groupBy, setGroupBy] = useState<GroupBy>("none")
  const [sortBy, setSortBy] = useState<SortBy>("severity")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    api.get("/issues")
      .then(res => setIssues(res.data.results || []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false))
  }, [])

  // Counts
  const counts = useMemo(() => {
    const high = issues.filter(i => i.severity.toUpperCase() === "HIGH").length
    const medium = issues.filter(i => i.severity.toUpperCase() === "MEDIUM").length
    const low = issues.filter(i => i.severity.toUpperCase() === "LOW").length
    return { high, medium, low, total: issues.length }
  }, [issues])

  // Filter + search + sort
  const filtered = useMemo(() => {
    let result = filter === "all"
      ? issues
      : issues.filter(i => i.severity.toUpperCase() === filter)

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.message.toLowerCase().includes(q) ||
        i.filename.toLowerCase().includes(q) ||
        i.tool.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.repository.toLowerCase().includes(q) ||
        i.pr_title.toLowerCase().includes(q)
      )
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "severity":
          return (severityOrder[a.severity.toUpperCase()] ?? 3) - (severityOrder[b.severity.toUpperCase()] ?? 3)
        case "file":
          return a.filename.localeCompare(b.filename)
        case "tool":
          return a.tool.localeCompare(b.tool)
        case "repository":
          return a.repository.localeCompare(b.repository)
        default:
          return 0
      }
    })

    return result
  }, [issues, filter, search, sortBy])

  // Grouped data
  const grouped = useMemo(() => {
    if (groupBy === "none") return null
    const map = new Map<string, Issue[]>()
    for (const issue of filtered) {
      const key = groupBy === "file" ? issue.filename
        : groupBy === "repository" ? issue.repository
        : issue.tool
      const arr = map.get(key) || []
      arr.push(issue)
      map.set(key, arr)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [filtered, groupBy])

  // Auto-expand all groups
  const expandedGroupsForRender = useMemo(() => {
    if (grouped && expandedGroups.size === 0) {
      return new Set(grouped.map(([key]) => key))
    }
    return expandedGroups
  }, [grouped, expandedGroups])

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      // If we haven't explicitly toggled yet, start from the auto-expanded state
      const base = prev.size === 0 && grouped ? new Set(grouped.map(([k]) => k)) : new Set(prev)
      if (base.has(key)) base.delete(key)
      else base.add(key)
      return base
    })
  }

  const uniqueRepos = useMemo(() => [...new Set(issues.map(i => i.repository))], [issues])
  const uniqueTools = useMemo(() => [...new Set(issues.map(i => i.tool))], [issues])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    )
  }

  const renderIssueCard = (issue: Issue, index: number) => {
    const config = severityConfig[issue.severity] || severityConfig.LOW
    const SevIcon = config.icon
    return (
      <Link href={`/pull-request/${issue.pr_id}`} key={`${issue.pr_id}-${issue.filename}-${issue.line}-${index}`}>
        <div
          className="group relative glass-card rounded-xl p-4 cursor-pointer hover:border-white/[0.1] animate-slide-up"
          style={{ animationDelay: `${Math.min(index, 15) * 40}ms` }}
        >
          {/* Severity accent line */}
          <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b ${config.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

          <div className="flex items-start justify-between gap-4 pl-3">
            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-semibold ${config.bg} ${config.text} ring-1 ${config.ring}`}>
                  <SevIcon size={11} />
                  {issue.severity.toUpperCase()}
                </span>
                <span className="text-[11px] text-slate-400 px-2 py-1 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] font-medium">{issue.tool}</span>
                {issue.category && (
                  <span className="text-[11px] text-slate-500 px-2 py-1 rounded-lg bg-white/[0.03]">{issue.category}</span>
                )}
                {issue.line && (
                  <span className="text-[11px] text-slate-500 font-mono px-2 py-1 rounded-lg bg-white/[0.03]">L{issue.line}</span>
                )}
              </div>

              {/* Message */}
              <p className="text-[13px] text-slate-200 mb-3 leading-relaxed group-hover:text-white transition-colors">{issue.message}</p>

              {/* Meta */}
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 font-mono">
                  <FileCode2 size={11} className="text-slate-600" />
                  {issue.filename}
                </span>
                <span className="flex items-center gap-1.5">
                  <GitPullRequest size={11} className="text-slate-600" />
                  #{issue.pr_number}
                </span>
                <span className="flex items-center gap-1.5">
                  <FolderGit2 size={11} className="text-slate-600" />
                  {issue.repository}
                </span>
              </div>
            </div>

            <ArrowRight size={14} className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Issues</h1>
            <p className="text-sm text-slate-400">
              {filtered.length} issue{filtered.length !== 1 ? "s" : ""} found
              {search && <span className="text-purple-400"> matching &quot;{search}&quot;</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Severity stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {([
          { key: "HIGH" as const, label: "High", count: counts.high, icon: Flame, color: "red", glow: "rgba(239, 68, 68, 0.08)" },
          { key: "MEDIUM" as const, label: "Medium", count: counts.medium, icon: CircleAlert, color: "amber", glow: "rgba(245, 158, 11, 0.08)" },
          { key: "LOW" as const, label: "Low", count: counts.low, icon: Info, color: "blue", glow: "rgba(59, 130, 246, 0.08)" },
        ]).map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(filter === s.key ? "all" : s.key)}
            className={`stat-card-glow glass-card rounded-xl p-4 text-left transition-all duration-300 ${
              filter === s.key ? `ring-2 ring-${s.color}-500/30` : ""
            }`}
            style={{ ["--glow-color" as string]: s.glow }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg bg-${s.color}-500/15 flex items-center justify-center`}>
                <s.icon size={16} className={`text-${s.color}-400`} />
              </div>
              {filter === s.key && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full bg-${s.color}-500/15 text-${s.color}-400 font-medium`}>
                  Active
                </span>
              )}
            </div>
            <div className={`text-2xl font-bold text-${s.color}-400 mb-0.5`}>
              <AnimatedCount value={s.count} />
            </div>
            <div className="text-[12px] text-slate-500">{s.label} severity</div>
          </button>
        ))}
      </div>

      {/* Severity distribution bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Severity Distribution</span>
          <span className="text-[11px] text-slate-500">{counts.total} total</span>
        </div>
        <SeverityBar high={counts.high} medium={counts.medium} low={counts.low} />
        <div className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-red-400" /> High
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Medium
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Low
          </span>
        </div>
      </div>

      {/* Search + controls bar */}
      <div className="glass-card rounded-xl p-3 mb-6">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search issues by message, file, tool, repo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/30 focus:ring-1 focus:ring-purple-500/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Toggle filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
              showFilters
                ? "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/25"
                : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]"
            }`}
          >
            <SlidersHorizontal size={13} />
            Filters
          </button>
        </div>

        {/* Expanded filter controls */}
        {showFilters && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.05]">
            {/* Severity filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">Severity</span>
              <div className="flex items-center gap-1">
                {(["all", "HIGH", "MEDIUM", "LOW"] as SeverityFilter[]).map(f => {
                  const isActive = filter === f
                  const colors: Record<SeverityFilter, string> = {
                    all: isActive ? "bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30" : "",
                    HIGH: isActive ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30" : "",
                    MEDIUM: isActive ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30" : "",
                    LOW: isActive ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30" : "",
                  }
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg transition-all duration-200 font-medium ${
                        isActive ? colors[f] : "text-slate-500 hover:text-white bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      {f === "all" ? "All" : f}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="w-px h-5 bg-white/[0.06]" />

            {/* Group by */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">Group</span>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value as GroupBy)}
                className="text-[11px] bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-purple-500/30 cursor-pointer"
              >
                <option value="none">None</option>
                <option value="file">File</option>
                <option value="repository">Repository</option>
                <option value="tool">Tool</option>
              </select>
            </div>

            <div className="w-px h-5 bg-white/[0.06]" />

            {/* Sort by */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">Sort</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="text-[11px] bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-purple-500/30 cursor-pointer"
              >
                <option value="severity">Severity</option>
                <option value="file">File name</option>
                <option value="tool">Tool</option>
                <option value="repository">Repository</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Active filters summary */}
      {(filter !== "all" || search || groupBy !== "none") && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[11px] text-slate-500">Active:</span>
          {filter !== "all" && (
            <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg ${severityConfig[filter].bg} ${severityConfig[filter].text} ring-1 ${severityConfig[filter].ring}`}>
              {filter}
              <button onClick={() => setFilter("all")} className="ml-1 hover:opacity-75"><X size={10} /></button>
            </span>
          )}
          {search && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20">
              &quot;{search}&quot;
              <button onClick={() => setSearch("")} className="ml-1 hover:opacity-75"><X size={10} /></button>
            </span>
          )}
          {groupBy !== "none" && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
              Grouped by {groupBy}
              <button onClick={() => setGroupBy("none")} className="ml-1 hover:opacity-75"><X size={10} /></button>
            </span>
          )}
          <button
            onClick={() => { setFilter("all"); setSearch(""); setGroupBy("none") }}
            className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Issue list */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <Shield className="text-slate-600" size={28} />
          </div>
          <p className="text-slate-400 text-sm font-medium">
            {search ? "No issues match your search" : "No issues found"}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {search ? "Try a different search term" : "Your code looks clean!"}
          </p>
        </div>
      ) : grouped ? (
        /* Grouped view */
        <div className="space-y-3">
          {grouped.map(([groupKey, groupIssues]) => {
            const isExpanded = expandedGroupsForRender.has(groupKey)
            const groupHigh = groupIssues.filter(i => i.severity.toUpperCase() === "HIGH").length
            const groupMedium = groupIssues.filter(i => i.severity.toUpperCase() === "MEDIUM").length
            const groupLow = groupIssues.filter(i => i.severity.toUpperCase() === "LOW").length
            const GroupIcon = groupBy === "file" ? FileCode2 : groupBy === "repository" ? FolderGit2 : Wrench

            return (
              <div key={groupKey} className="glass-card rounded-xl overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="text-slate-500 transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                    <ChevronRight size={14} />
                  </div>
                  <GroupIcon size={14} className="text-slate-400" />
                  <span className="text-[13px] text-slate-200 font-medium font-mono truncate flex-1">{groupKey}</span>

                  {/* Mini severity counts */}
                  <div className="flex items-center gap-2">
                    {groupHigh > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />{groupHigh}
                      </span>
                    )}
                    {groupMedium > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{groupMedium}
                      </span>
                    )}
                    {groupLow > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />{groupLow}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded-md">{groupIssues.length}</span>
                </button>

                {/* Group issues */}
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2 border-t border-white/[0.04]">
                    <div className="pt-3">
                      {groupIssues.map((issue, i) => renderIssueCard(issue, i))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Flat view */
        <div className="space-y-2">
          {filtered.map((issue, i) => renderIssueCard(issue, i))}
        </div>
      )}

      {/* Footer stat */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-white/[0.04]">
          <span className="text-[11px] text-slate-600">
            Showing {filtered.length} of {counts.total} issues
            {uniqueRepos.length > 0 && ` across ${uniqueRepos.length} ${uniqueRepos.length === 1 ? "repository" : "repositories"}`}
            {uniqueTools.length > 0 && ` • ${uniqueTools.length} ${uniqueTools.length === 1 ? "tool" : "tools"}`}
          </span>
        </div>
      )}
    </div>
  )
}