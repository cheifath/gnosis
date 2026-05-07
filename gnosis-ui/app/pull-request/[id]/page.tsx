"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api/client"
import {
  ArrowLeft,
  GitPullRequest,
  FolderGit2,
  User,
  FileCode2,
  AlertTriangle,
  Shield,
  Wrench,
  Loader2,
  Download,
  CheckCircle2,
  XCircle,
  Timer,
  CircleDashed,
  Flame,
  CircleAlert,
  Info,
  Sparkles,
  Bug,
  ChevronRight,
  PackageOpen,
} from "lucide-react"

type Issue = {
  tool: string
  category: string
  severity: string
  line: number | null
  message: string
}

type FileAnalysis = {
  id: number
  filename: string
  analysis_type: string
  issues: Issue[]
  review: string | null
  full_debug: string | null
  confidence: number | null
  fix_available: boolean
  diff: string | null
}

type PRDetail = {
  repository: string
  pr_number: number
  title: string
  author: string
  status: string
  files: FileAnalysis[]
}

const severityConfig: Record<string, { bg: string; text: string; dot: string; ring: string; icon: typeof Flame; gradient: string }> = {
  HIGH:   { bg: "bg-red-500/10",   text: "text-red-400",   dot: "bg-red-400",   ring: "ring-red-500/20",   icon: Flame,      gradient: "from-red-500 to-orange-500" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", ring: "ring-amber-500/20", icon: CircleAlert, gradient: "from-amber-500 to-yellow-500" },
  LOW:    { bg: "bg-blue-500/10",  text: "text-blue-400",  dot: "bg-blue-400",  ring: "ring-blue-500/20",  icon: Info,        gradient: "from-blue-500 to-cyan-500" },
  high:   { bg: "bg-red-500/10",   text: "text-red-400",   dot: "bg-red-400",   ring: "ring-red-500/20",   icon: Flame,      gradient: "from-red-500 to-orange-500" },
  medium: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", ring: "ring-amber-500/20", icon: CircleAlert, gradient: "from-amber-500 to-yellow-500" },
  low:    { bg: "bg-blue-500/10",  text: "text-blue-400",  dot: "bg-blue-400",  ring: "ring-blue-500/20",  icon: Info,        gradient: "from-blue-500 to-cyan-500" },
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; icon: typeof CheckCircle2; label: string }> = {
  completed:  { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", icon: CheckCircle2,  label: "Completed" },
  failed:     { bg: "bg-red-500/10",     text: "text-red-400",     dot: "bg-red-400",     icon: XCircle,       label: "Failed" },
  processing: { bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400",   icon: Timer,         label: "Processing" },
  pending:    { bg: "bg-slate-500/10",   text: "text-slate-400",   dot: "bg-slate-400",   icon: CircleDashed,  label: "Pending" },
}

function severityToNum(sev: string): number {
  switch (sev.toUpperCase()) {
    case "HIGH": return 3
    case "MEDIUM": return 2
    case "LOW": return 1
    default: return 0
  }
}

type FileFilter = "all" | "issues" | "fixes" | "clean"
type FileSort = "name" | "severity" | "issues"
type Tab = "issues" | "review" | "debug" | "fix"

export default function PullRequestPage() {
  const params = useParams()
  const [pr, setPr] = useState<PRDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFile, setActiveFile] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<Tab>("issues")
  const [filter, setFilter] = useState<FileFilter>("all")
  const [sort, setSort] = useState<FileSort>("name")

  useEffect(() => {
    if (!params.id) return
    api.get(`/prs/${params.id}`)
      .then(res => setPr(res.data))
      .catch(() => setError("Pull request not found"))
      .finally(() => setLoading(false))
  }, [params.id])

  const filteredFiles = useMemo(() => {
    if (!pr) return []
    let files = [...pr.files]
    if (filter === "issues") files = files.filter(f => f.issues.length > 0)
    else if (filter === "fixes") files = files.filter(f => f.fix_available)
    else if (filter === "clean") files = files.filter(f => f.issues.length === 0)

    if (sort === "name") files.sort((a, b) => a.filename.localeCompare(b.filename))
    else if (sort === "severity") {
      files.sort((a, b) => {
        const aMax = a.issues.length ? Math.max(...a.issues.map(i => severityToNum(i.severity))) : 0
        const bMax = b.issues.length ? Math.max(...b.issues.map(i => severityToNum(i.severity))) : 0
        return bMax - aMax
      })
    } else if (sort === "issues") files.sort((a, b) => b.issues.length - a.issues.length)
    return files
  }, [pr, filter, sort])

  // Resolve the effective tab — force away from "issues" for llm-only files
  const currentFile = filteredFiles[activeFile] || null
  const isCurrentLlmOnly = currentFile?.analysis_type === "llm-only"
  const effectiveTab = (isCurrentLlmOnly && activeTab === "issues") ? "review" : activeTab

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

  if (!pr) return null

  const file = currentFile
  const totalIssues = pr.files.reduce((sum, f) => sum + f.issues.length, 0)
  const totalFixes = pr.files.filter(f => f.fix_available).length
  const stCfg = statusConfig[pr.status] || statusConfig.pending
  const StatusIcon = stCfg.icon

  const tabItems: { key: Tab; label: string; icon: typeof AlertTriangle; count?: number }[] = [
    ...(!isCurrentLlmOnly ? [{ key: "issues" as Tab, label: "Issues", icon: AlertTriangle, count: file?.issues.length || 0 }] : []),
    { key: "review", label: "AI Review", icon: Sparkles },
    { key: "debug", label: "Full Debug", icon: Bug },
    { key: "fix", label: "Fix", icon: Wrench },
  ]

  const filterItems: { key: FileFilter; label: string; icon: typeof FileCode2 }[] = [
    { key: "all", label: "All", icon: FileCode2 },
    { key: "issues", label: "Issues", icon: AlertTriangle },
    { key: "fixes", label: "Fixes", icon: Wrench },
    { key: "clean", label: "Clean", icon: Shield },
  ]

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/pull-request"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Pull Requests
      </Link>

      {/* PR header card */}
      <div className="glass-card rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center shrink-0">
            <GitPullRequest size={22} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">
                <span className="text-slate-500 font-mono mr-1.5">#{pr.pr_number}</span>
                {pr.title}
              </h1>
              <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium ${stCfg.bg} ${stCfg.text}`}>
                <StatusIcon size={12} />
                {stCfg.label}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2 text-[12px] text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <FolderGit2 size={12} className="text-slate-500" />
                {pr.repository}
              </span>
              <span className="flex items-center gap-1.5">
                <User size={12} className="text-slate-500" />
                {pr.author}
              </span>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-4 mt-5 pt-5 border-t border-white/[0.05] flex-wrap">
          <div className="flex items-center gap-2 text-[12px]">
            <div className="w-7 h-7 rounded-lg bg-slate-800/60 flex items-center justify-center">
              <FileCode2 size={13} className="text-slate-400" />
            </div>
            <div>
              <span className="text-white font-semibold">{pr.files.length}</span>
              <span className="text-slate-500 ml-1">file{pr.files.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="w-px h-5 bg-white/[0.06]" />
          <div className="flex items-center gap-2 text-[12px]">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle size={13} className="text-amber-400" />
            </div>
            <div>
              <span className="text-white font-semibold">{totalIssues}</span>
              <span className="text-slate-500 ml-1">issue{totalIssues !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="w-px h-5 bg-white/[0.06]" />
          <div className="flex items-center gap-2 text-[12px]">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Wrench size={13} className="text-emerald-400" />
            </div>
            <div>
              <span className="text-white font-semibold">{totalFixes}</span>
              <span className="text-slate-500 ml-1">fix{totalFixes !== 1 ? "es" : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5">
        {/* File sidebar */}
        <div className="w-72 shrink-0 space-y-3">
          {/* Filter buttons */}
          <div className="glass-card rounded-xl p-3">
            <div className="flex flex-wrap gap-1 mb-3">
              {filterItems.map(f => {
                const isActive = filter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => { setFilter(f.key); setActiveFile(0) }}
                    className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg transition-all duration-200 font-medium ${
                      isActive
                        ? "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/25"
                        : "text-slate-500 hover:text-white bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <f.icon size={11} />
                    {f.label}
                  </button>
                )
              })}
            </div>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as FileSort); setActiveFile(0) }}
              className="w-full text-[11px] bg-white/[0.04] border border-white/[0.06] text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500/30 cursor-pointer"
            >
              <option value="name">Sort by Name</option>
              <option value="severity">Sort by Severity</option>
              <option value="issues">Sort by Issue Count</option>
            </select>
          </div>

          {/* File list */}
          <div className="glass-card rounded-xl p-2">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Files
              </span>
              <span className="text-[10px] text-slate-600">
                {filteredFiles.length}{filteredFiles.length !== pr.files.length ? `/${pr.files.length}` : ""}
              </span>
            </div>
            <div className="space-y-0.5">
              {filteredFiles.map((f, i) => {
                const isActive = i === activeFile
                const maxSev = f.issues.length
                  ? f.issues.reduce((max, iss) => Math.max(max, severityToNum(iss.severity)), 0)
                  : 0
                const sevColor = maxSev === 3 ? "bg-red-400" : maxSev === 2 ? "bg-amber-400" : maxSev === 1 ? "bg-blue-400" : ""

                return (
                  <button
                    key={f.filename}
                    onClick={() => { setActiveFile(i); setActiveTab(f.analysis_type === "llm-only" ? "review" : "issues") }}
                    className={`group w-full text-left px-3 py-2.5 rounded-lg text-[12px] transition-all duration-200 relative ${
                      isActive
                        ? "bg-gradient-to-r from-purple-500/15 to-indigo-500/10 text-white"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-purple-400 to-indigo-500" />
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCode2 size={13} className={isActive ? "text-purple-400" : "text-slate-600"} />
                        <span className="truncate font-medium">{f.filename}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {f.fix_available && (
                          <Wrench size={10} className="text-emerald-500" />
                        )}
                        {f.issues.length > 0 && (
                          <span className="flex items-center gap-1 text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-md font-medium">
                            {sevColor && <span className={`w-1.5 h-1.5 rounded-full ${sevColor}`} />}
                            {f.issues.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 ml-[21px]">
                      <span className="text-[10px] text-slate-600">{f.analysis_type}</span>
                      {f.confidence !== null && (
                        <>
                          <span className="text-[10px] text-slate-700">·</span>
                          <span className="text-[10px] text-slate-500">{(f.confidence * 100).toFixed(1)}%</span>
                        </>
                      )}
                    </div>
                  </button>
                )
              })}
              {filteredFiles.length === 0 && (
                <div className="px-3 py-6 text-center">
                  <PackageOpen size={20} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-[11px] text-slate-600">No files match filter</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="glass-card rounded-xl mb-4">
            <div className="flex">
              {tabItems.map(tab => {
                const isActive = effectiveTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center gap-2 px-5 py-3 text-[13px] font-medium transition-all duration-200 first:rounded-l-xl last:rounded-r-xl ${
                      isActive
                        ? "text-white bg-white/[0.04]"
                        : "text-slate-500 hover:text-white hover:bg-white/[0.02]"
                    }`}
                  >
                    <tab.icon size={14} className={isActive ? "text-purple-400" : ""} />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                        isActive
                          ? "bg-purple-500/15 text-purple-300"
                          : "bg-white/[0.04] text-slate-600"
                      }`}>
                        {tab.count}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full bg-gradient-to-r from-purple-500 to-indigo-500" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab content */}
          {file && (
            <div className="animate-fade-in">
              {/* Issues tab */}
              {effectiveTab === "issues" && (
                <div>
                  {file.issues.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                        <Shield className="text-emerald-400" size={24} />
                      </div>
                      <p className="text-slate-300 text-sm font-medium">No issues found</p>
                      <p className="text-slate-500 text-xs mt-1">This file is clean!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...file.issues]
                        .sort((a, b) => severityToNum(b.severity) - severityToNum(a.severity))
                        .map((issue, i) => {
                          const cfg = severityConfig[issue.severity] || severityConfig.LOW
                          const SevIcon = cfg.icon
                          return (
                            <div
                              key={i}
                              className="glass-card rounded-xl p-4 animate-slide-up relative group"
                              style={{ animationDelay: `${i * 40}ms` }}
                            >
                              {/* Severity accent */}
                              <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b ${cfg.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

                              <div className="pl-3">
                                {/* Badge row */}
                                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                                  <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-semibold ${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}`}>
                                    <SevIcon size={11} />
                                    {issue.severity.toUpperCase()}
                                  </span>
                                  <span className="text-[11px] text-slate-400 px-2 py-1 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06] font-medium">
                                    {issue.tool}
                                  </span>
                                  {issue.category && (
                                    <span className="text-[11px] text-slate-500 px-2 py-1 rounded-lg bg-white/[0.03]">
                                      {issue.category}
                                    </span>
                                  )}
                                  {issue.line && (
                                    <span className="text-[11px] text-slate-500 font-mono px-2 py-1 rounded-lg bg-white/[0.03]">
                                      Line {issue.line}
                                    </span>
                                  )}
                                </div>
                                {/* Message */}
                                <p className="text-[13px] text-slate-200 leading-relaxed group-hover:text-white transition-colors">
                                  {issue.message}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Review tab */}
              {effectiveTab === "review" && (
                <div className="glass-card rounded-xl">
                  {file.review ? (
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={14} className="text-purple-400" />
                        <span className="text-[12px] font-semibold text-slate-300 uppercase tracking-wider">AI Review</span>
                      </div>
                      <pre className="text-[13px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {file.review}
                      </pre>
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="text-slate-600" size={24} />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">No AI review available</p>
                      <p className="text-slate-500 text-xs mt-1">Review data not generated for this file</p>
                    </div>
                  )}
                </div>
              )}

              {/* Debug tab */}
              {effectiveTab === "debug" && (
                <div className="glass-card rounded-xl">
                  {file.full_debug ? (
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Bug size={14} className="text-cyan-400" />
                        <span className="text-[12px] font-semibold text-slate-300 uppercase tracking-wider">Debug Analysis</span>
                      </div>
                      <pre className="text-[13px] text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {file.full_debug}
                      </pre>
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                        <Bug className="text-slate-600" size={24} />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">No debug analysis available</p>
                      <p className="text-slate-500 text-xs mt-1">Debug data not generated for this file</p>
                    </div>
                  )}
                </div>
              )}

              {/* Fix tab */}
              {effectiveTab === "fix" && (
                <div>
                  {file.fix_available ? (
                    <div className="space-y-3">
                      {/* Download bar */}
                      <div className="glass-card rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                            <Wrench size={14} className="text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-[13px] text-white font-medium">Fix available</p>
                            <p className="text-[11px] text-slate-500">Download the corrected version of this file</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const res = await api.get(`/fix/${file.id}/`, { responseType: "blob" })
                              const url = window.URL.createObjectURL(new Blob([res.data]))
                              const a = document.createElement("a")
                              a.href = url
                              a.download = file.filename
                              a.click()
                              window.URL.revokeObjectURL(url)
                            } catch {}
                          }}
                          className="flex items-center gap-2 text-[12px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
                        >
                          <Download size={13} />
                          Download Fix
                        </button>
                      </div>

                      {/* Diff viewer */}
                      {file.diff && (
                        <div className="glass-card rounded-xl overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
                            <ChevronRight size={12} className="text-slate-500" />
                            <span className="text-[11px] text-slate-400 font-medium">Unified Diff</span>
                            <span className="text-[11px] text-slate-600 ml-auto font-mono">{file.filename}</span>
                          </div>
                          <div className="overflow-x-auto font-mono text-[12px] leading-[1.6]">
                            {file.diff.split("\n").map((line, idx) => {
                              let bg = ""
                              let textColor = "text-slate-500"
                              let prefix = " "
                              if (line.startsWith("+++") || line.startsWith("---")) {
                                textColor = "text-slate-500"
                              } else if (line.startsWith("@@")) {
                                textColor = "text-blue-400"
                                bg = "bg-blue-500/[0.06]"
                              } else if (line.startsWith("+")) {
                                textColor = "text-emerald-300"
                                bg = "bg-emerald-500/[0.08]"
                                prefix = "+"
                              } else if (line.startsWith("-")) {
                                textColor = "text-red-300"
                                bg = "bg-red-500/[0.08]"
                                prefix = "-"
                              }
                              return (
                                <div key={idx} className={`flex ${bg} hover:bg-white/[0.02] transition-colors`}>
                                  <span className="w-12 shrink-0 text-right pr-3 text-slate-700 select-none border-r border-white/[0.04] py-px">
                                    {idx + 1}
                                  </span>
                                  <span className={`w-5 shrink-0 text-center select-none py-px ${textColor} opacity-50`}>
                                    {prefix !== " " ? prefix : ""}
                                  </span>
                                  <span className={`flex-1 px-3 py-px ${textColor}`}>
                                    {line.startsWith("+") || line.startsWith("-") ? line.slice(1) : line || "\u00A0"}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="glass-card rounded-2xl p-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                        <Wrench className="text-slate-600" size={24} />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">No fix available</p>
                      <p className="text-slate-500 text-xs mt-1">No automated fix was generated for this file</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!file && filteredFiles.length > 0 && (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-slate-400 text-sm">Select a file to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}