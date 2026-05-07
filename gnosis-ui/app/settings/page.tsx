"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api/client"
import { useAuth } from "@/lib/auth-context"
import { apiUpdateProfile, apiRevokeGitHub } from "@/lib/api/auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Settings, Github, Cpu, Save, CheckCircle2, AlertCircle, Loader2, User, Link2, Shield, Pencil, Lock, Eye, EyeOff, Unlink } from "lucide-react"
import { apiGetGitHubOAuthUrl } from "@/lib/api/auth"
import Image from "next/image"

type GnosisSettings = {
  github_app_id: string
  github_installation_id: string
  github_pem_path: string
  default_repositories: string[]
  enable_llm_analysis: boolean
  enable_tool_backed_analysis: boolean
}

const defaultSettings: GnosisSettings = {
  github_app_id: "",
  github_installation_id: "",
  github_pem_path: "",
  default_repositories: [],
  enable_llm_analysis: true,
  enable_tool_backed_analysis: true,
}

export default function SettingsPage() {
  const { user, isAdmin, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState<"account" | "github" | "admin">("account")
  const [settings, setSettings] = useState<GnosisSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ username: "", email: "" })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileStatus, setProfileStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" })

  // Password change state
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // GitHub revoke state
  const [revokingGitHub, setRevokingGitHub] = useState(false)
  const [revokeConfirm, setRevokeConfirm] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      api.get("/settings/")
        .then(res => setSettings(res.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isAdmin])

  const handleChange = (key: keyof GnosisSettings, value: string | boolean | string[]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaveStatus("idle")
  }

  const handleSave = () => {
    setSaving(true)
    setSaveStatus("idle")
    api.post("/settings/update/", settings)
      .then(() => setSaveStatus("success"))
      .catch(() => setSaveStatus("error"))
      .finally(() => setSaving(false))
  }

  const handleConnectGitHub = async () => {
    try {
      const url = await apiGetGitHubOAuthUrl()
      window.location.href = url
    } catch {
      setSaveStatus("error")
    }
  }

  const handleRevokeGitHub = async () => {
    if (!revokeConfirm) {
      setRevokeConfirm(true)
      return
    }
    setRevokingGitHub(true)
    try {
      await apiRevokeGitHub()
      await refreshUser()
      setRevokeConfirm(false)
    } catch {
      setSaveStatus("error")
    } finally {
      setRevokingGitHub(false)
    }
  }

  const handleEditProfile = () => {
    setProfileForm({ username: user?.username || "", email: user?.email || "" })
    setEditingProfile(true)
    setProfileStatus({ type: "idle", message: "" })
  }

  const handleCancelEdit = () => {
    setEditingProfile(false)
    setProfileStatus({ type: "idle", message: "" })
  }

  const handleSaveProfile = async () => {
    const usernameChanged = profileForm.username !== user?.username
    const emailChanged = profileForm.email !== user?.email
    if (!usernameChanged && !emailChanged) {
      setProfileStatus({ type: "error", message: "No changes detected. Update at least one field." })
      return
    }
    setProfileSaving(true)
    setProfileStatus({ type: "idle", message: "" })
    try {
      await apiUpdateProfile({
        ...(usernameChanged && { username: profileForm.username }),
        ...(emailChanged && { email: profileForm.email }),
      })
      await refreshUser()
      setEditingProfile(false)
      setProfileStatus({ type: "success", message: "Profile updated successfully." })
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to update profile."
      setProfileStatus({ type: "error", message })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleSavePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordStatus({ type: "error", message: "New passwords do not match." })
      return
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordStatus({ type: "error", message: "New password must be at least 8 characters." })
      return
    }
    if (passwordForm.new_password === passwordForm.current_password) {
      setPasswordStatus({ type: "error", message: "New password must be different from the current password." })
      return
    }
    setPasswordSaving(true)
    setPasswordStatus({ type: "idle", message: "" })
    try {
      await apiUpdateProfile({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setChangingPassword(false)
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" })
      setPasswordStatus({ type: "success", message: "Password changed successfully." })
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to change password."
      setPasswordStatus({ type: "error", message })
    } finally {
      setPasswordSaving(false)
    }
  }

  const tabs = [
    { key: "account" as const, label: "Account", icon: User },
    { key: "github" as const, label: "Git Integrations", icon: Github },
    ...(isAdmin ? [{ key: "admin" as const, label: "Admin Settings", icon: Shield }] : []),
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
            <Settings size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm text-slate-400">Manage your account and platform configuration</p>
          </div>
        </div>

        {activeTab === "admin" && isAdmin && (
          <Button onClick={handleSave} disabled={saving} size="lg" className="bg-purple-600 hover:bg-purple-500">
            {saving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 glass-card rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white/[0.08] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {saveStatus === "success" && (
        <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-6 text-sm">
          <CheckCircle2 size={16} />
          Settings saved successfully.
        </div>
      )}

      {saveStatus === "error" && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-sm">
          <AlertCircle size={16} />
          Failed to save. Please try again.
        </div>
      )}

      <div className="space-y-6 max-w-2xl">

        {/* Account Tab */}
        {activeTab === "account" && (
          <>
            {profileStatus.type !== "idle" && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                profileStatus.type === "success"
                  ? "text-green-400 bg-green-500/10 border border-green-500/20"
                  : "text-red-400 bg-red-500/10 border border-red-500/20"
              }`}>
                {profileStatus.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {profileStatus.message}
              </div>
            )}

            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-4 border-b border-white/[0.04]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                      <User size={18} />
                      Account Information
                    </h3>
                    <p className="text-[13px] text-slate-500 mt-0.5">
                      Your account details and role.
                    </p>
                  </div>
                  {!editingProfile && (
                    <Button variant="outline" size="sm" onClick={handleEditProfile} className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300">
                      <Pencil size={14} />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-5 space-y-4">
                {editingProfile ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Username</label>
                      <Input
                        value={profileForm.username}
                        onChange={e => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                        className="bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50"
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
                      <Input
                        type="email"
                        value={profileForm.email}
                        onChange={e => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50"
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user?.role === "admin"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}>
                        {user?.role === "admin" ? <Shield size={12} /> : <User size={12} />}
                        {user?.role === "admin" ? "Admin" : "Developer"}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveProfile} disabled={profileSaving} size="sm" className="bg-purple-600 hover:bg-purple-500">
                        {profileSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        {profileSaving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={profileSaving} className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                      <p className="text-white">{user?.username}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                      <p className="text-white">{user?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user?.role === "admin"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}>
                        {user?.role === "admin" ? <Shield size={12} /> : <User size={12} />}
                        {user?.role === "admin" ? "Admin" : "Developer"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Change Password Card */}
            {passwordStatus.type !== "idle" && (
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                passwordStatus.type === "success"
                  ? "text-green-400 bg-green-500/10 border border-green-500/20"
                  : "text-red-400 bg-red-500/10 border border-red-500/20"
              }`}>
                {passwordStatus.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {passwordStatus.message}
              </div>
            )}

            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-4 border-b border-white/[0.04]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                      <Lock size={18} />
                      Password
                    </h3>
                    <p className="text-[13px] text-slate-500 mt-0.5">
                      Update your password to keep your account secure.
                    </p>
                  </div>
                  {!changingPassword && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setChangingPassword(true); setPasswordStatus({ type: "idle", message: "" }) }}
                      className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300"
                    >
                      <Lock size={14} />
                      Change Password
                    </Button>
                  )}
                </div>
              </div>
              {changingPassword && (
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Current Password</label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.current_password}
                        onChange={e => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                        className="bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50 pr-10"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">New Password</label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.new_password}
                        onChange={e => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                        className="bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50 pr-10"
                        placeholder="Enter new password (min 8 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Confirm New Password</label>
                    <Input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={e => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                      className="bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSavePassword} disabled={passwordSaving} size="sm" className="bg-purple-600 hover:bg-purple-500">
                      {passwordSaving ? <Loader2 className="animate-spin" size={14} /> : <Lock size={14} />}
                      {passwordSaving ? "Updating..." : "Update Password"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setChangingPassword(false); setPasswordForm({ current_password: "", new_password: "", confirm_password: "" }); setPasswordStatus({ type: "idle", message: "" }) }}
                      disabled={passwordSaving}
                      className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* GitHub Integration Tab (for all users) */}
        {activeTab === "github" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-5 pb-4 border-b border-white/[0.04]">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <Github size={18} />
                GitHub Connection
              </h3>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Connect your GitHub account to enable PR analysis on your repositories.
              </p>
            </div>
            <div className="p-5">
              {user?.github_connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url && (
                        <Image
                          src={user.avatar_url}
                          alt={user.github_login || ""}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      )}
                      <div>
                        <p className="text-white font-medium">{user.github_login}</p>
                        <div className="flex items-center gap-1.5 text-green-400 text-sm">
                          <Link2 size={14} />
                          Connected
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-white/[0.04] pt-4">
                    <p className="text-sm text-slate-400 mb-3">
                      Revoking will disconnect your GitHub account from Gnosis. You can reconnect at any time.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRevokeGitHub}
                        disabled={revokingGitHub}
                        className={revokeConfirm
                          ? "border-red-500 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                          : "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        }
                      >
                        {revokingGitHub ? <Loader2 className="animate-spin" size={14} /> : <Unlink size={14} />}
                        {revokingGitHub ? "Revoking..." : revokeConfirm ? "Confirm Revoke" : "Revoke Connection"}
                      </Button>
                      {revokeConfirm && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevokeConfirm(false)}
                          className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-slate-400 text-sm mb-4">
                    Connect your GitHub account to grant Gnosis permission to analyze your pull requests and repositories.
                  </p>
                  <Button
                    onClick={handleConnectGitHub}
                    className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08]"
                  >
                    <Github size={16} />
                    Connect GitHub Account
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Settings Tab */}
        {activeTab === "admin" && isAdmin && (
          <>
            {/* GitHub App Integration */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-4 border-b border-white/[0.04]">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                  <Github size={18} />
                  GitHub App Integration
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Configure your GitHub App credentials for repository monitoring and PR analysis.
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    GitHub App ID
                  </label>
                  <Input
                    placeholder="e.g. 123456"
                    value={settings.github_app_id}
                    onChange={e => handleChange("github_app_id", e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Found in your GitHub App&apos;s general settings page.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Installation ID
                  </label>
                  <Input
                    placeholder="e.g. 78901234"
                    value={settings.github_installation_id}
                    onChange={e => handleChange("github_installation_id", e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    The installation ID from when the app was installed on your org/account.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    PEM Key Path
                  </label>
                  <Input
                    placeholder="e.g. /path/to/private-key.pem"
                    value={settings.github_pem_path}
                    onChange={e => handleChange("github_pem_path", e.target.value)}
                    className="bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Absolute path to the GitHub App&apos;s private key file on the server.
                  </p>
                </div>
              </div>
            </div>

            {/* Default Repositories */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-4 border-b border-white/[0.04]">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                  <Github size={18} />
                  Default Repositories
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Repositories to monitor by default for incoming pull requests.
                </p>
              </div>
              <div className="p-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Repositories (comma-separated)
                  </label>
                  <Input
                    placeholder="e.g. owner/repo1, owner/repo2"
                    value={settings.default_repositories.join(", ")}
                    onChange={e =>
                      handleChange(
                        "default_repositories",
                        e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                      )
                    }
                    className="bg-white/[0.04] border-white/[0.08] focus:border-purple-500/50"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Enter in owner/repo format, separated by commas.
                  </p>
                </div>
              </div>
            </div>

            {/* Analysis Options */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 pb-4 border-b border-white/[0.04]">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                  <Cpu size={18} />
                  PR Analysis Options
                </h3>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Control which analysis engines run when processing pull requests.
                </p>
              </div>
              <div className="p-5 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={settings.enable_llm_analysis}
                    onChange={e => handleChange("enable_llm_analysis", e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                      Enable LLM Analysis
                    </span>
                    <p className="text-xs text-slate-500">
                      Use AI-powered analysis for code review summaries, bug detection, and fix suggestions.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={settings.enable_tool_backed_analysis}
                    onChange={e => handleChange("enable_tool_backed_analysis", e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                      Enable Tool-Backed Analysis
                    </span>
                    <p className="text-xs text-slate-500">
                      Run static analyzers (Flake8, Bandit, Radon) for linting, security, and complexity checks.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
