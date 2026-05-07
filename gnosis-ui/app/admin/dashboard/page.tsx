"use client"

import { useEffect, useState, useMemo } from "react"
import AdminLayout from "@/components/layout/admin-layout"
import { apiAdminDashboard, AdminDashboardStats } from "@/lib/api/admin"
import StatCard from "@/components/dashboard/stat-card"
import {
  GitPullRequest,
  Users,
  FolderGit2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Github,
  Wrench,
  TrendingUp,
  Zap,
  Clock,
  Shield,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const BAR_COLORS = ["#a855f7", "#6366f1", "#3b82f6", "#22d3ee", "#10b981", "#f59e0b"]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white font-semibold">{p.value}</span>
          <span className="text-slate-400 text-xs">{p.dataKey === "count" ? "PRs" : p.dataKey}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiAdminDashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const trendData = useMemo(() => {
    if (!stats) return []
    return stats.pr_trends.map(t => ({
      date: t.date,
      count: t.count,
    }))
  }, [stats])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-red-400" size={32} />
        </div>
      </AdminLayout>
    )
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <XCircle className="text-slate-600" size={28} />
          </div>
          <p className="text-slate-400 text-sm font-medium">Failed to load dashboard data</p>
        </div>
      </AdminLayout>
    )
  }

  const totalToolIssues = stats.tool_distribution.reduce((s, t) => s + t.count, 0)

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
              <Shield size={20} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-slate-400">Platform overview and monitoring</p>
            </div>
          </div>
        </div>

        {/* Primary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total PRs" value={stats.total_prs} icon={GitPullRequest} color="purple" />
          <StatCard title="Completed" value={stats.completed_prs} icon={CheckCircle2} color="emerald" />
          <StatCard title="Failed" value={stats.failed_prs} icon={XCircle} color="red" />
          <StatCard title="Total Users" value={stats.total_users} icon={Users} color="blue" />
        </div>

        {/* Secondary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Repositories", value: stats.total_repos, icon: FolderGit2, color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/10" },
            { label: "GitHub Connected", value: stats.github_connected_users, icon: Github, color: "text-slate-300", bg: "bg-slate-500/10", ring: "ring-slate-500/10" },
            { label: "Total Issues", value: stats.total_issues, icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10", ring: "ring-orange-500/10" },
            { label: "Fix Suggestions", value: stats.total_fixes, icon: Wrench, color: "text-cyan-400", bg: "bg-cyan-500/10", ring: "ring-cyan-500/10" },
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* PR Processing Trends - Area Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <TrendingUp size={16} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-white">PR Processing Trends</h3>
                  <p className="text-[11px] text-slate-500">Daily PR analysis volume</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-[11px] text-slate-400">PRs</span>
              </div>
            </div>
            {trendData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <TrendingUp size={32} className="mb-3 opacity-40" />
                <p className="text-sm">No trend data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientPRTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
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
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#gradientPRTrend)"
                    dot={{ r: 3, fill: "#3b82f6", stroke: "#0f172a", strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: "#3b82f6", stroke: "#0f172a", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Tool Distribution - Horizontal Bar Chart */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Zap size={16} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">Tool Usage Distribution</h3>
                <p className="text-[11px] text-slate-500">Issues detected per analysis tool</p>
              </div>
            </div>
            {stats.tool_distribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Zap size={32} className="mb-3 opacity-40" />
                <p className="text-sm">No tool data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.tool_distribution.map((tool, i) => {
                  const pct = totalToolIssues > 0 ? (tool.count / totalToolIssues) * 100 : 0
                  const color = BAR_COLORS[i % BAR_COLORS.length]
                  return (
                    <div key={tool.tool} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                          <span className="text-[13px] text-slate-300 font-medium">{tool.tool}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-white">{tool.count}</span>
                          <span className="text-[11px] text-slate-500">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-800/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Processing Errors */}
        {stats.recent_errors.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
                <XCircle size={16} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">Recent Processing Errors</h3>
                <p className="text-[11px] text-slate-500">{stats.recent_errors.length} failed PR{stats.recent_errors.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="space-y-2">
              {stats.recent_errors.map((err, i) => (
                <div
                  key={err.id}
                  className="group relative flex items-center justify-between rounded-xl p-4 hover:bg-white/[0.03] border border-transparent hover:border-red-500/10 transition-all duration-200 animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-red-500 to-orange-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-4 pl-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 ring-1 ring-red-500/20">
                      <GitPullRequest size={16} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white">
                        PR #{err.pr_number}: {err.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <FolderGit2 size={10} />
                          {err.repository}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(err.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    failed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
