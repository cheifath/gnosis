"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/layout/admin-layout"
import {
  apiAdminListUsers,
  apiAdminDeleteUser,
  apiAdminUpdateUser,
  AdminUser,
} from "@/lib/api/admin"
import {
  Users,
  Loader2,
  Github,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Search,
  MoreVertical,
  Clock,
  GitPullRequest,
  UserCircle,
  Trash,
} from "lucide-react"

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionMenu, setActionMenu] = useState<number | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)

  const loadUsers = () => {
    setLoading(true)
    apiAdminListUsers()
      .then((data) => setUsers(data.results))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleUpdateUser = async (
    userId: number,
    data: { role?: string; is_active?: boolean; revoke_github?: boolean }
  ) => {
    setUpdating(userId)
    try {
      await apiAdminUpdateUser(userId, data)
      loadUsers()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
      setActionMenu(null)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    const ok = window.confirm("Are you sure you want to delete this user? This action cannot be undone.")
    if (!ok) return
    setUpdating(userId)
    try {
      await apiAdminDeleteUser(userId)
      loadUsers()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
      setActionMenu(null)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const adminCount = users.filter(u => u.role === "admin").length
  const activeCount = users.filter(u => u.is_active).length
  const githubCount = users.filter(u => u.github_connected).length

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
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
              <Users size={20} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Users Management</h1>
              <p className="text-sm text-slate-400">
                {users.length} user{users.length !== 1 ? "s" : ""} registered on the platform
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 glass-card rounded-xl px-4 py-2.5 w-80 ring-1 ring-white/[0.06] focus-within:ring-red-500/30 transition-all">
            <Search size={16} className="text-slate-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 w-full"
            />
          </div>
        </div>

        {/* Summary filter cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Users", value: users.length, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", ring: "ring-blue-500/10" },
            { label: "Admins", value: adminCount, icon: Shield, color: "text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/10" },
            { label: "Active", value: activeCount, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/10" },
            { label: "GitHub Connected", value: githubCount, icon: Github, color: "text-purple-400", bg: "bg-purple-500/10", ring: "ring-purple-500/10" },
          ].map((card) => (
            <div key={card.label} className={`glass-card rounded-xl p-4 ring-1 ${card.ring}`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon size={14} className={card.color} />
                </div>
                <span className={`text-xl font-bold ${card.color}`}>{card.value}</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Users List */}
        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-6">
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <Users className="text-slate-600" size={28} />
              </div>
              <p className="text-slate-400 text-sm font-medium">No users found</p>
              <p className="text-slate-500 text-xs mt-1">Try adjusting your search query</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u, i) => (
              <div
                key={u.id}
                className="group relative glass-card rounded-xl p-4 animate-slide-up hover:ring-1 hover:ring-white/[0.06] transition-all duration-200"
                style={{ animationDelay: `${Math.min(i, 15) * 40}ms` }}
              >
                {/* Accent line on left */}
                <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b ${
                  u.role === "admin" ? "from-red-500 to-orange-500" : "from-blue-500 to-cyan-500"
                } opacity-40 group-hover:opacity-100 transition-opacity`} />

                <div className="flex items-center justify-between pl-3">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-semibold text-white overflow-hidden ring-2 ring-white/[0.06]">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className={`bg-gradient-to-br ${u.role === "admin" ? "from-red-400 to-orange-400" : "from-blue-400 to-cyan-400"} bg-clip-text text-transparent`}>
                            {u.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${u.is_active ? "bg-emerald-500" : "bg-slate-600"}`} />
                    </div>

                    {/* User info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-medium text-white truncate">{u.username}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider ${
                          u.role === "admin"
                            ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                            : "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                        }`}>
                          {u.role === "admin" && <Shield size={9} />}
                          {u.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        <span className="truncate">{u.email}</span>
                        {u.github_connected && (
                          <span className="flex items-center gap-1 text-emerald-400/70">
                            <Github size={10} />
                            {u.github_login}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: meta + actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden lg:flex items-center gap-4 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <GitPullRequest size={11} />
                        {u.total_prs} PR{u.total_prs !== 1 ? "s" : ""}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-medium ${
                        u.is_active
                          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-400" : "bg-slate-400"}`} />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                      {u.last_login && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {timeAgo(u.last_login)}
                        </span>
                      )}
                    </div>

                    {/* Actions menu */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          setActionMenu(actionMenu === u.id ? null : u.id)
                        }}
                        className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                        disabled={updating === u.id}
                      >
                        {updating === u.id ? (
                          <Loader2 size={14} className="animate-spin text-slate-400" />
                        ) : (
                          <MoreVertical size={14} className="text-slate-400" />
                        )}
                      </button>

                      {actionMenu === u.id && (
                        <div className="absolute right-0 bottom-full mb-2 w-52 bg-slate-800/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
                          {u.role === "developer" && (
                            <button
                              onClick={() => handleUpdateUser(u.id, { role: "admin" })}
                              className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-slate-300 hover:bg-white/[0.04] transition-colors"
                            >
                              <Shield size={14} className="text-red-400" />
                              Make Admin
                            </button>
                          )}

                          {u.github_connected && (
                            <button
                              onClick={() => handleUpdateUser(u.id, { revoke_github: true })}
                              className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-slate-300 hover:bg-white/[0.04] transition-colors"
                            >
                              <Github size={14} className="text-orange-400" />
                              Revoke GitHub
                            </button>
                          )}

                          <button
                            onClick={() => handleUpdateUser(u.id, { is_active: !u.is_active })}
                            className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-slate-300 hover:bg-white/[0.04] transition-colors"
                          >
                            {u.is_active ? (
                              <>
                                <UserX size={14} className="text-red-400" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck size={14} className="text-green-400" />
                                Activate
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-slate-300 hover:bg-white/[0.04] transition-colors"
                          >
                            <Trash size={14} className="text-rose-400" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
