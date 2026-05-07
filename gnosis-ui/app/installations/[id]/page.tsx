"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api/client"
import Image from "next/image"
import {
  Building2,
  User,
  FolderGit2,
  GitPullRequest,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Settings,
  Trash2,
  ExternalLink,
  RefreshCw,
} from "lucide-react"

type RepoData = {
  id: number
  name: string
  total_prs: number
  completed_prs: number
  created_at: string
}

type InstallationDetail = {
  id: number
  github_installation_id: string
  account_login: string
  account_type: "User" | "Organization"
  account_avatar_url: string
  repository_selection: "all" | "selected"
  repositories: RepoData[]
  created_at: string
}

export default function InstallationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [installation, setInstallation] = useState<InstallationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false)
  const [uninstalling, setUninstalling] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    api.get(`/installations/${params.id}/`)
      .then(res => setInstallation(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  const handleConfigure = async () => {
    try {
      const res = await api.get(`/installations/${params.id}/configure-url/`)
      if (res.data.url) {
        window.open(res.data.url, "_blank")
      }
    } catch {}
  }

  const handleUninstall = async () => {
    setUninstalling(true)
    try {
      const res = await api.post(`/installations/${params.id}/uninstall/`)
      if (res.data.github_uninstall_url) {
        window.open(res.data.github_uninstall_url, "_blank")
      }
      router.push("/installations")
    } catch {
      setUninstalling(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.post("/installations/sync/")
      const res = await api.get(`/installations/${params.id}/`)
      setInstallation(res.data)
    } catch {}
    setSyncing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    )
  }

  if (!installation) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Installation not found</p>
        <Link href="/installations" className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block">
          Back to installations
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link href="/installations" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6 group">
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        All Installations
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {installation.account_avatar_url ? (
            <Image
              src={installation.account_avatar_url}
              alt={installation.account_login}
              width={56}
              height={56}
              className="w-14 h-14 rounded-xl border border-white/[0.06]"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-slate-800/60 flex items-center justify-center">
              {installation.account_type === "Organization" ? (
                <Building2 size={24} className="text-slate-400" />
              ) : (
                <User size={24} className="text-slate-400" />
              )}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-white">{installation.account_login}</h1>
              <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md ${
                installation.account_type === "Organization"
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-slate-500/10 text-slate-400"
              }`}>
                {installation.account_type}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">
                Active
              </span>
              <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-md ${
                installation.repository_selection === "all"
                  ? "bg-purple-500/10 text-purple-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}>
                {installation.repository_selection === "all" ? "All repositories" : "Selected repositories"}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {installation.repositories.length} repositor{installation.repositories.length === 1 ? "y" : "ies"} connected &middot; Installed {new Date(installation.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white text-xs font-medium transition-all"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
            Sync Repos
          </button>
          <button
            onClick={handleConfigure}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white text-xs font-medium transition-all"
          >
            <Settings size={13} />
            Configure Repos
            <ExternalLink size={11} className="opacity-50" />
          </button>
          {showUninstallConfirm ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleUninstall}
                disabled={uninstalling}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-all"
              >
                {uninstalling ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Confirm Uninstall
              </button>
              <button
                onClick={() => setShowUninstallConfirm(false)}
                className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 text-xs font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowUninstallConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 text-slate-400 hover:text-red-400 text-xs font-medium transition-all"
            >
              <Trash2 size={13} />
              Uninstall
            </button>
          )}
        </div>
      </div>

      {/* Repositories */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <FolderGit2 size={16} className="text-blue-400" />
          <h2 className="text-base font-semibold text-white">Repositories</h2>
        </div>

        {installation.repositories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <FolderGit2 className="text-slate-600" size={24} />
            </div>
            <p className="text-slate-400 text-sm font-medium">No repositories yet</p>
            <p className="text-slate-500 text-xs mt-1">Repositories will appear here once GitHub sends them via the installation</p>
          </div>
        ) : (
          <div className="space-y-2">
            {installation.repositories.map((repo, i) => (
              <Link href={`/repository/${repo.id}`} key={repo.id}>
                <div
                  className="group flex items-center justify-between rounded-xl p-4 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-all duration-200 cursor-pointer"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-800/60 flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
                      <FolderGit2 size={15} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white">{repo.name}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <GitPullRequest size={10} />
                          {repo.total_prs} PR{repo.total_prs !== 1 ? "s" : ""}
                        </span>
                        <span>{repo.completed_prs} completed</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
