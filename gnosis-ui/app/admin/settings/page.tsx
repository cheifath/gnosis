"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/layout/admin-layout"
import {
  apiAdminGetPlatformSettings,
  apiAdminUpdatePlatformSettings,
  PlatformSettings,
} from "@/lib/api/admin"
import {
  Settings,
  Loader2,
  Save,
  Wrench,
  Brain,
  FolderGit2,
  CheckCircle2,
  Sparkles,
  Shield,
} from "lucide-react"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    apiAdminGetPlatformSettings()
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const updateField = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    if (!settings) return
    setSettings({ ...settings, [key]: value })
    setDirty(true)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await apiAdminUpdatePlatformSettings({
        enable_llm_analysis: settings.enable_llm_analysis,
        enable_tool_backed_analysis: settings.enable_tool_backed_analysis,
        default_repositories: settings.default_repositories,
      })
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
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

  if (!settings) {
    return (
      <AdminLayout>
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
            <Settings className="text-slate-600" size={28} />
          </div>
          <p className="text-slate-400 text-sm font-medium">Failed to load settings</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="animate-fade-in max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500/20 to-zinc-500/20 flex items-center justify-center">
              <Settings size={20} className="text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
              <p className="text-sm text-slate-400">Configure platform-wide analysis options</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-[12px] text-emerald-400 animate-slide-up">
                <CheckCircle2 size={14} />
                Settings saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                dirty
                  ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
                  : "bg-slate-800/80 text-slate-500 cursor-not-allowed"
              } disabled:opacity-50`}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Analysis Tools Section */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Sparkles size={16} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">PR Analysis Options</h3>
              <p className="text-[11px] text-slate-500">Control which analysis engines are active</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Tool-Backed Analysis Toggle */}
            <label className="group flex items-center justify-between p-5 rounded-xl glass-card cursor-pointer hover:ring-1 hover:ring-white/[0.06] transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20 group-hover:ring-2 transition-all">
                  <Wrench size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white">Tool-Backed Analysis</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Use Bandit, Flake8, Radon and other static analysis tools
                  </p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.enable_tool_backed_analysis}
                  onChange={(e) => updateField("enable_tool_backed_analysis", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-7 bg-slate-700/80 peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-blue-500 rounded-full transition-all duration-300 ring-1 ring-white/[0.06]" />
                <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300 shadow-sm" />
              </div>
            </label>

            {/* LLM Analysis Toggle */}
            <label className="group flex items-center justify-between p-5 rounded-xl glass-card cursor-pointer hover:ring-1 hover:ring-white/[0.06] transition-all duration-200">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20 group-hover:ring-2 transition-all">
                  <Brain size={16} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white">LLM Analysis</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Use AI/LLM for code review and fix generation
                  </p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.enable_llm_analysis}
                  onChange={(e) => updateField("enable_llm_analysis", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-7 bg-slate-700/80 peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-purple-500 rounded-full transition-all duration-300 ring-1 ring-white/[0.06]" />
                <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full peer-checked:translate-x-5 transition-transform duration-300 shadow-sm" />
              </div>
            </label>
          </div>
        </div>

        {/* Default Repositories */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <FolderGit2 size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Default Repositories</h3>
              <p className="text-[11px] text-slate-500">Comma-separated list of default repositories to monitor</p>
            </div>
          </div>

          <input
            type="text"
            value={(settings.default_repositories || []).join(", ")}
            onChange={(e) =>
              updateField(
                "default_repositories",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            className="w-full bg-slate-800/60 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/30 transition-all"
            placeholder="owner/repo1, owner/repo2"
          />

          {settings.default_repositories && settings.default_repositories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {settings.default_repositories.map((repo) => (
                <span
                  key={repo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20"
                >
                  <FolderGit2 size={11} />
                  {repo}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
