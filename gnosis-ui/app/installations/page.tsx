"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { api } from "@/lib/api/client"
import {
  Shield,
  Download,
  Building2,
  User,
  FolderGit2,
  ArrowRight,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  Settings,
} from "lucide-react"

type Installation = {
  id: number
  github_installation_id: string
  account_login: string
  account_type: "User" | "Organization"
  account_avatar_url: string
  repository_count: number
  repository_selection: "all" | "selected"
  created_at: string
}

export default function InstallationsPage() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [installUrl, setInstallUrl] = useState("")
  const [uninstalling, setUninstalling] = useState<number | null>(null)
  const [showUninstallConfirm, setShowUninstallConfirm] = useState<number | null>(null)

  const fetchInstallations = () => {
    return api.get("/installations/").then(res => setInstallations(res.data.results || []))
  }

  const syncFromGitHub = async () => {
    setSyncing(true)
    try {
      await api.post("/installations/sync/")
      await fetchInstallations()
    } catch {
      // silently fail
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    // On page load: sync from GitHub first, then fetch
    Promise.all([
      api.get("/installations/install-url/").then(res => setInstallUrl(res.data.url)).catch(() => {}),
    ]).then(() => {
      // Auto-sync from GitHub, then load
      api.post("/installations/sync/")
        .then(() => fetchInstallations())
        .catch(() => fetchInstallations())
        .finally(() => setLoading(false))
    })
  }, [])

  const handleInstall = () => {
    if (installUrl) {
      window.location.href = installUrl
    }
  }

  const handleUninstall = async (instId: number) => {
    setUninstalling(instId)
    try {
      const res = await api.post(`/installations/${instId}/uninstall/`)
      setInstallations(prev => prev.filter(i => i.id !== instId))
      setShowUninstallConfirm(null)
      // Open GitHub to fully uninstall
      if (res.data.github_uninstall_url) {
        window.open(res.data.github_uninstall_url, "_blank")
      }
    } catch {
      // silently fail
    } finally {
      setUninstalling(null)
    }
  }

  const handleConfigure = async (instId: number) => {
    try {
      const res = await api.get(`/installations/${instId}/configure-url/`)
      if (res.data.url) {
        window.open(res.data.url, "_blank")
      }
    } catch {
      // silently fail
    }
  }

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
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center">
              <Shield size={20} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Installations</h1>
              <p className="text-sm text-slate-400">Manage where GNOSIS is installed</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={syncFromGitHub}
            disabled={syncing}
            className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync from GitHub"}
          </button>
          {installUrl && installations.length === 0 && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 group"
            >
              <Plus size={16} />
              Install on GitHub
              <ExternalLink size={13} className="opacity-60" />
            </button>
          )}
        </div>
      </div>

      {/* No installations state */}
      {installations.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-6">
            <Download size={32} className="text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No installations yet</h2>
          <p className="text-sm text-slate-400 mb-2 max-w-md mx-auto">
            Install the GNOSIS GitHub App on your personal account or organization to start getting AI-powered code reviews on every pull request.
          </p>
          <p className="text-xs text-slate-500 mb-8 max-w-md mx-auto">
            You can choose to install on all repositories or select specific ones. GNOSIS works with both personal repos and organization repos.
          </p>

          {/* How it works */}
          <div className="max-w-lg mx-auto mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              {[
                { step: "1", title: "Install", desc: "Click install to add GNOSIS to your GitHub account", icon: Download },
                { step: "2", title: "Select Repos", desc: "Choose which repositories to monitor", icon: FolderGit2 },
                { step: "3", title: "Auto Review", desc: "Every PR gets AI-powered code review", icon: CheckCircle2 },
              ].map((s) => (
                <div key={s.step} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 w-5 h-5 rounded-md flex items-center justify-center">{s.step}</span>
                    <s.icon size={14} className="text-slate-400" />
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">{s.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            {installUrl && (
              <button
                onClick={handleInstall}
                className="inline-flex items-center gap-2.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white px-8 py-3.5 rounded-xl font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 group"
              >
                <Shield size={18} />
                Install GNOSIS GitHub App
                <ExternalLink size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600 mt-6">
            Already installed? Click &quot;Sync from GitHub&quot; above to detect existing installations.
          </p>
        </div>
      ) : (
        /* Installation card — single installation view */
        (() => {
          const inst = installations[0]
          return (
            <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up">
              {/* Card top accent */}
              <div className="h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-emerald-500" />

              <div className="p-8">
                {/* Profile section */}
                <div className="flex items-start gap-6 mb-8">
                  <Link href={`/installations/${inst.id}`}>
                    {inst.account_avatar_url ? (
                      <Image
                        src={inst.account_avatar_url}
                        alt={inst.account_login}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-2xl border-2 border-white/[0.08] hover:border-purple-500/30 transition-all duration-300"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-800/60 flex items-center justify-center border-2 border-white/[0.08]">
                        {inst.account_type === "Organization" ? (
                          <Building2 size={32} className="text-slate-400" />
                        ) : (
                          <User size={32} className="text-slate-400" />
                        )}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Link href={`/installations/${inst.id}`}>
                        <h2 className="text-2xl font-bold text-white hover:text-purple-300 transition-colors">{inst.account_login}</h2>
                      </Link>
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${
                        inst.account_type === "Organization"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}>
                        {inst.account_type}
                      </span>
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      GNOSIS is installed and actively reviewing pull requests on this account.
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                    <FolderGit2 size={18} className="text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{inst.repository_count}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Repositor{inst.repository_count === 1 ? "y" : "ies"}</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                    <Shield size={18} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white capitalize">
                      {inst.repository_selection === "all" ? "All" : "Selected"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Repo Access</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                    <CheckCircle2 size={18} className="text-violet-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">
                      {new Date(inst.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Installed</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-6 border-t border-white/[0.06]">
                  <button
                    onClick={() => handleConfigure(inst.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white text-sm font-medium transition-all duration-300"
                  >
                    <Settings size={15} />
                    Configure Repos
                  </button>
                  <Link
                    href={`/installations/${inst.id}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/80 to-violet-600/80 hover:from-purple-500 hover:to-violet-500 text-white text-sm font-medium shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-300"
                  >
                    View Details
                    <ArrowRight size={15} />
                  </Link>
                  <div className="flex-1" />
                  {showUninstallConfirm === inst.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 mr-1">Are you sure?</span>
                      <button
                        onClick={() => handleUninstall(inst.id)}
                        disabled={uninstalling === inst.id}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium transition-all"
                      >
                        {uninstalling === inst.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Confirm
                      </button>
                      <button
                        onClick={() => setShowUninstallConfirm(null)}
                        className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 text-sm font-medium transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowUninstallConfirm(inst.id)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 text-slate-500 hover:text-red-400 text-sm font-medium transition-all"
                    >
                      <Trash2 size={14} />
                      Uninstall
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()
      )}
    </div>
  )
}
