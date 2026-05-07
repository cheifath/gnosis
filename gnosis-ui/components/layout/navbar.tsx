"use client"

import { useAuth } from "@/lib/auth-context"
import { Search, Bell } from "lucide-react"
import Image from "next/image"

export default function Navbar({ hideSearch = false }: { hideSearch?: boolean }) {
  const { user } = useAuth()

  return (
    <div className="h-16 border-b border-white/[0.06] bg-slate-950/50 backdrop-blur-xl flex items-center justify-between px-6 relative">
      {/* Subtle bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />

      {/* Search */}
      {!hideSearch && (
        <div className="relative group">
          <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 w-96 transition-all duration-200 group-focus-within:border-purple-500/30 group-focus-within:bg-white/[0.06] group-focus-within:shadow-lg group-focus-within:shadow-purple-500/5">
            <Search size={15} className="text-slate-500 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder="Search repositories, PRs, issues..."
              className="bg-transparent border-none outline-none text-[13px] text-white placeholder:text-slate-500 w-full"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] text-slate-500 font-mono">
              ⌘K
            </kbd>
          </div>
        </div>
      )}
      {hideSearch && <div />}

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* AI Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
          <div className="relative flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="text-[11px] font-medium text-emerald-400">AI Active</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2.5 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all duration-200">
          <Bell size={17} />
        </button>

        {/* Divider */}
        <div className="w-px h-7 bg-white/[0.06]" />

        {/* User */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-semibold overflow-hidden ring-1 ring-white/[0.08]">
            {user?.avatar_url ? (
              <Image src={user.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
            ) : (
              <span className="bg-gradient-to-br from-purple-400 to-indigo-400 bg-clip-text text-transparent text-xs">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            )}
          </div>
          <span className="text-[13px] font-medium text-slate-300">{user?.username}</span>
        </div>
      </div>
    </div>
  )
}