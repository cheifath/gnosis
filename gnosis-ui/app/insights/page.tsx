"use client"

import { useEffect, useState, useMemo } from "react"
import { api } from "@/lib/api/client"
import {
  BarChart3,
  FileWarning,
  Shield,
  Code2,
  Loader2,
  TrendingUp,
  Activity,
  Zap,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type InsightsData = {
  severity_distribution: { severity: string; count: number }[]
  tool_distribution: { tool: string; count: number }[]
  language_distribution: { language: string; count: number }[]
  top_risky_files: { filename: string; issues: number }[]
  issues_over_time: { date: string; count: number }[]
  prs_over_time: { date: string; count: number }[]
}

const SEVERITY_COLORS: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#3b82f6",
  INFO: "#64748b",
}

const PIE_COLORS = ["#a855f7", "#6366f1", "#3b82f6", "#22d3ee", "#10b981", "#f59e0b"]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white font-semibold">{p.value}</span>
          <span className="text-slate-400 text-xs">{p.dataKey === "prs" ? "PRs" : "Issues"}</span>
        </div>
      ))}
    </div>
  )
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get("/insights/")
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Merge PR + Issue timelines for combined area chart
  const activityData = useMemo(() => {
    if (!data) return []
    const dateMap = new Map<string, { date: string; prs: number; issues: number }>()
    data.prs_over_time.forEach(p => {
      const d = dateMap.get(p.date) || { date: p.date, prs: 0, issues: 0 }
      d.prs = p.count
      dateMap.set(p.date, d)
    })
    data.issues_over_time.forEach(p => {
      const d = dateMap.get(p.date) || { date: p.date, prs: 0, issues: 0 }
      d.issues = p.count
      dateMap.set(p.date, d)
    })
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [data])

  // Severity pie data
  const severityPieData = useMemo(() => {
    if (!data) return []
    return data.severity_distribution.map(s => ({
      name: s.severity,
      value: s.count,
      color: SEVERITY_COLORS[s.severity] || "#64748b",
    }))
  }, [data])

  // Language pie data
  const langPieData = useMemo(() => {
    if (!data) return []
    return data.language_distribution.map((l, i) => ({
      name: l.language || "Unknown",
      value: l.count,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    )
  }

  if (!data) {
    return <p className="text-slate-400">Failed to load insights.</p>
  }

  const totalIssues = data.severity_distribution.reduce((sum, s) => sum + s.count, 0)
  const totalFiles = data.language_distribution.reduce((sum, l) => sum + l.count, 0)
  const totalPRs = data.prs_over_time.reduce((sum, p) => sum + p.count, 0)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center">
            <BarChart3 size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Insights</h1>
            <p className="text-sm text-slate-400">Analytics and trends across your repositories</p>
          </div>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Issues", value: totalIssues, icon: Shield, color: "text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/10" },
          { label: "PRs Analyzed", value: totalPRs, icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10", ring: "ring-purple-500/10" },
          { label: "Files Analyzed", value: totalFiles, icon: Code2, color: "text-blue-400", bg: "bg-blue-500/10", ring: "ring-blue-500/10" },
          { label: "Days Active", value: data.prs_over_time.length, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/10" },
        ].map((card) => (
          <div key={card.label} className={`glass-card rounded-2xl p-5 ring-1 ${card.ring}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${card.bg}`}>
                <card.icon className={card.color} size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Over Time — Full Width Area Chart */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Activity Over Time</h3>
              <p className="text-[11px] text-slate-500">PRs analyzed and issues detected daily</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span className="text-[11px] text-slate-400">PRs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="text-[11px] text-slate-400">Issues</span>
            </div>
          </div>
        </div>
        {activityData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Activity size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No activity data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientPRs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradientIssues" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={{ stroke: "rgba(148,163,184,0.08)" }}
                tickLine={false}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="prs"
                stroke="#a855f7"
                strokeWidth={2.5}
                fill="url(#gradientPRs)"
                dot={{ r: 3, fill: "#a855f7", stroke: "#0f172a", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#a855f7", stroke: "#0f172a", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="issues"
                stroke="#f43f5e"
                strokeWidth={2.5}
                fill="url(#gradientIssues)"
                dot={{ r: 3, fill: "#f43f5e", stroke: "#0f172a", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#f43f5e", stroke: "#0f172a", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Second row: Severity Donut + Language Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Severity Distribution */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <Shield size={16} className="text-red-400" />
            </div>
            <h3 className="text-[15px] font-semibold text-white">Severity Distribution</h3>
          </div>
          {severityPieData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No data yet</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {severityPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(30,41,59,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {severityPieData.map((s) => {
                  const pct = totalIssues > 0 ? Math.round((s.value / totalIssues) * 100) : 0
                  return (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="text-[13px] text-slate-300">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-white">{s.value}</span>
                        <span className="text-[11px] text-slate-500">({pct}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Language Distribution */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Code2 size={16} className="text-blue-400" />
            </div>
            <h3 className="text-[15px] font-semibold text-white">Language Distribution</h3>
          </div>
          {langPieData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No data yet</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={langPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {langPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(30,41,59,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {langPieData.map((l) => {
                  const pct = totalFiles > 0 ? Math.round((l.value / totalFiles) * 100) : 0
                  return (
                    <div key={l.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                        <span className="text-[13px] text-slate-300">{l.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-white">{l.value}</span>
                        <span className="text-[11px] text-slate-500">({pct}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Third row: Detection by Tool (Bar) + Top Risky Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection by Tool */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Zap size={16} className="text-amber-400" />
            </div>
            <h3 className="text-[15px] font-semibold text-white">Detection by Tool</h3>
          </div>
          {data.tool_distribution.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.tool_distribution} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="tool" tick={{ fontSize: 12, fill: "#cbd5e1" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(30,41,59,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  cursor={{ fill: "rgba(168,85,247,0.05)" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Bar dataKey="count" fill="#a855f7" radius={[0, 6, 6, 0]} barSize={20}>
                  {data.tool_distribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Risky Files */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <FileWarning size={16} className="text-red-400" />
            </div>
            <h3 className="text-[15px] font-semibold text-white">Top Risky Files</h3>
          </div>
          {data.top_risky_files.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No data yet</p>
          ) : (
            <div className="space-y-2">
              {data.top_risky_files.map((f, i) => {
                const maxIssues = Math.max(...data.top_risky_files.map(x => x.issues))
                const barWidth = maxIssues > 0 ? (f.issues / maxIssues) * 100 : 0
                return (
                  <div key={f.filename} className="group relative rounded-xl p-3 hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-slate-600 font-mono w-4">#{i + 1}</span>
                        <span className="text-[13px] text-slate-200 font-mono truncate">{f.filename}</span>
                      </div>
                      <span className="text-[12px] font-semibold text-red-400 tabular-nums">
                        {f.issues} issue{f.issues !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/50 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
