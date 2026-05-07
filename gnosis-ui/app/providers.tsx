"use client"

import { AuthProvider } from "@/lib/auth-context"
import ProtectedRoute from "@/components/layout/protected-route"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
    </AuthProvider>
  )
}
