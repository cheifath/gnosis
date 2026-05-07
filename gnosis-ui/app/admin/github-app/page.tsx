"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/layout/admin-layout"
import {
  apiAdminGetGitHubApp,
  apiAdminUpdateGitHubApp,
  apiAdminTestGitHubConnection,
  GitHubAppSettings,
} from "@/lib/api/admin"
import {
  Github,
  Loader2,
  Save,
  Plug,
  CheckCircle2,
  XCircle,
  FolderGit2,
  Key,
  Hash,
  FileKey,
  Clock,
  ExternalLink,
} from "lucide-react"

export default function AdminGitHubAppPage() {
  const [settings, setSettings] = useState<GitHubAppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null)
  const [form, setForm] = useState({
    github_app_id: "",
    github_installation_id: "",
    github_pem_path: "",
  })

  useEffect(() => {
    apiAdminGetGitHubApp()
      .then((data) => {
        setSettings(data)
        setForm({
          github_app_id: data.github_app_id,
          github_installation_id: data.github_installation_id,
          github_pem_path: data.github_pem_path,
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiAdminUpdateGitHubApp(form)
      setTestResult(null)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await apiAdminTestGitHubConnection()
      setTestResult(result)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Connection failed"
      setTestResult({ status: "error", message: msg })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-red-400" size={32} />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="animate-fade-in max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-400/20 flex items-center justify-center">
              <Github size={20} className="text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">GitHub App Management</h1>
              <p className="text-sm text-slate-400">Configure GitHub App credentials for PR analysis</p>
            </div>
          </div>
        </div>

        {/* Connection Status Banner */}
        {testResult && (
          <div
            className={`glass-card rounded-2xl p-4 mb-6 ring-1 animate-slide-up ${
              testResult.status === "connected"
                ? "ring-emerald-500/20"
                : "ring-red-500/20"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                testResult.status === "connected"
                  ? "bg-emerald-500/15"
                  : "bg-red-500/15"
              }`}>
                {testResult.status === "connected" ? (
                  <CheckCircle2 size={20} className="text-emerald-400" />
                ) : (
                  <XCircle size={20} className="text-red-400" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  testResult.status === "connected" ? "text-emerald-300" : "text-red-300"
                }`}>
                  {testResult.status === "connected" ? "Connection Successful" : "Connection Failed"}
                </p>
                <p className="text-[12px] text-slate-400">{testResult.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Credentials Form */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Key size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">App Credentials</h3>
              <p className="text-[11px] text-slate-500">GitHub App authentication configuration</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm text-slate-300 mb-2 font-medium">
                <Hash size={14} className="text-slate-500" />
                GitHub App ID
              </label>
              <input
                type="text"
                value={form.github_app_id}
                onChange={(e) => setForm({ ...form, github_app_id: e.target.value })}
                className="w-full bg-slate-800/60 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/30 transition-all"
                placeholder="Enter GitHub App ID"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-slate-300 mb-2 font-medium">
                <Hash size={14} className="text-slate-500" />
                Installation ID
              </label>
              <input
                type="text"
                value={form.github_installation_id}
                onChange={(e) => setForm({ ...form, github_installation_id: e.target.value })}
                className="w-full bg-slate-800/60 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/30 transition-all"
                placeholder="Enter Installation ID"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-slate-300 mb-2 font-medium">
                <FileKey size={14} className="text-slate-500" />
                PEM Key Path
              </label>
              <input
                type="text"
                value={form.github_pem_path}
                onChange={(e) => setForm({ ...form, github_pem_path: e.target.value })}
                className="w-full bg-slate-800/60 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/30 transition-all"
                placeholder="/path/to/private-key.pem"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all ring-1 ring-white/[0.06] hover:ring-white/[0.1]"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
                Test Connection
              </button>
            </div>
          </div>
        </div>

        {/* Connected Repositories */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <FolderGit2 size={16} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">Connected Repositories</h3>
                <p className="text-[11px] text-slate-500">Repositories linked to this GitHub App</p>
              </div>
            </div>
            {settings?.connected_repos && settings.connected_repos.length > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                {settings.connected_repos.length} repo{settings.connected_repos.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {!settings?.connected_repos || settings.connected_repos.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <FolderGit2 className="text-slate-600" size={28} />
              </div>
              <p className="text-slate-400 text-sm font-medium">No repositories connected</p>
              <p className="text-slate-500 text-xs mt-1">Configure your GitHub App to connect repositories</p>
            </div>
          ) : (
            <div className="space-y-2">
              {settings.connected_repos.map((repo, i) => (
                <div
                  key={repo.id}
                  className="group flex items-center justify-between rounded-xl p-4 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-all duration-200 animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center shrink-0 group-hover:bg-blue-500/10 transition-colors">
                      <FolderGit2 size={16} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-white group-hover:text-blue-300 transition-colors">
                        {repo.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Hash size={10} />
                          Installation: {repo.installation_id}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(repo.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
