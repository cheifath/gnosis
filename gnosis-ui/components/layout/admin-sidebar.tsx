"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  LayoutDashboard,
  Users,
  GitPullRequest,
  ScrollText,
  Settings,
  Github,
  Shield,
  ChevronUp,
  LogOut,
} from "lucide-react"
import { useState } from "react"

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/github-app", label: "GitHub App", icon: Github },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/prs", label: "PRs", icon: GitPullRequest },
  { href: "/admin/logs", label: "Logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <div className="w-[272px] bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 backdrop-blur-xl border-r border-white/[0.06] h-screen flex flex-col relative">
      {/* Subtle gradient accent line on the right border */}
      <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-red-500/20 via-transparent to-orange-500/20" />

      {/* Logo */}
      <div className="p-6 pb-2">
        <Link href="/admin/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 opacity-0 group-hover:opacity-25 blur-md transition-all duration-500" />
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 via-rose-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/25 group-hover:shadow-red-500/50 group-hover:scale-105 transition-all duration-300 ring-1 ring-white/10">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-white/0 to-white/10" />
              <Shield className="text-white relative z-10 drop-shadow-sm" size={19} strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-extrabold tracking-wide bg-gradient-to-r from-white via-red-100 to-slate-300 bg-clip-text text-transparent group-hover:from-red-200 group-hover:via-white group-hover:to-orange-200 transition-all duration-300">
              GNOSIS
            </span>
            <span className="text-[9px] font-medium tracking-[0.25em] text-slate-500 -mt-0.5 group-hover:text-red-400/70 transition-colors duration-300">
              ADMIN PANEL
            </span>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-5 my-3 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-2">
          Management
        </p>
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-red-500/15 to-orange-500/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-red-400 to-orange-500" />
              )}
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-red-500/20 text-red-300"
                  : "text-slate-500 group-hover:text-slate-300 group-hover:bg-white/[0.04]"
              }`}>
                <item.icon size={16} />
              </div>
              {item.label}
              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-red-400 shadow-sm shadow-red-400/50" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section at bottom */}
      <div className="p-3 pt-0">
        <div className="mx-2 mb-3 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />

        {/* Admin badge */}
        <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/15">
          <div className="w-5 h-5 rounded-md bg-red-500/20 flex items-center justify-center">
            <Shield size={11} className="text-red-400" />
          </div>
          <span className="text-[11px] font-semibold text-red-300 tracking-wide">Admin Panel</span>
        </div>

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-semibold text-white overflow-hidden ring-2 ring-white/[0.06] group-hover:ring-red-500/20 transition-all">
                {user?.avatar_url ? (
                  <Image src={user.avatar_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
                ) : (
                  <span className="bg-gradient-to-br from-red-400 to-orange-400 bg-clip-text text-transparent">
                    {user?.username?.charAt(0).toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-medium text-white truncate">{user?.username}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <ChevronUp
              size={14}
              className={`text-slate-500 transition-transform duration-200 ${showUserMenu ? "" : "rotate-180"}`}
            />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-slate-300 hover:bg-white/[0.04] transition-colors"
              >
                <LayoutDashboard size={14} />
                Switch to User View
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
