"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import Sidebar from "@/components/layout/sidebar"
import Navbar from "@/components/layout/navbar"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublic = pathname === "/" || pathname.startsWith("/login")
  const isAdminRoute = pathname.startsWith("/admin")
  const isFullScreenRoute = pathname === "/connect-github"

  useEffect(() => {
    if (loading) return

    // Redirect unauthenticated users away from protected pages
    if (!user && !isPublic) {
      router.replace("/login")
      return
    }

    // Block non-admin users from admin routes
    if (user && !isAdmin && isAdminRoute) {
      router.replace("/dashboard")
      return
    }

    // Redirect admin users into admin section from developer pages
    if (user && isAdmin && !isPublic && !isAdminRoute && !isFullScreenRoute) {
      router.replace("/admin/dashboard")
    }
  }, [loading, user, pathname, router, isPublic, isAdmin, isAdminRoute, isFullScreenRoute])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-purple-400" size={32} />
      </div>
    )
  }

  // Public pages render without sidebar/navbar
  if (isPublic) {
    return <>{children}</>
  }

  // Block rendering until redirect completes
  if (!user) {
    return null
  }

  // Block non-admin from admin routes (render nothing while redirect fires)
  if (isAdminRoute && !isAdmin) {
    return null
  }

  // Admin routes handle their own layout
  if (isAdminRoute) {
    return <>{children}</>
  }

  // Full-screen routes (like connect-github) render without sidebar/navbar
  if (isFullScreenRoute) {
    return <>{children}</>
  }

  // Authenticated pages get the full app layout
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
