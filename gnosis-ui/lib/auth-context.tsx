"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { AuthUser, apiGetMe, apiLogin, apiSignup, apiGitHubCallback, apiConnectGitHub } from "@/lib/api/auth"

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (username: string, email: string, password: string) => Promise<void>
  loginWithGitHub: (code: string) => Promise<void>
  connectGitHub: (code: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("gnosis_access_token")
    if (token) {
      apiGetMe()
        .then((userData) => {
          setUser(userData)
          setLoading(false)
        })
        .catch(() => {
          localStorage.removeItem("gnosis_access_token")
          localStorage.removeItem("gnosis_refresh_token")
          setUser(null)
          setLoading(false)
        })
    } else {
      queueMicrotask(() => setLoading(false))
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password)
    localStorage.setItem("gnosis_access_token", data.access)
    localStorage.setItem("gnosis_refresh_token", data.refresh)
    setUser(data.user)
    router.push(data.user.role === "admin" ? "/admin/dashboard" : "/dashboard")
  }

  const signup = async (username: string, email: string, password: string) => {
    const data = await apiSignup(username, email, password)
    localStorage.setItem("gnosis_access_token", data.access)
    localStorage.setItem("gnosis_refresh_token", data.refresh)
    setUser(data.user)
    router.push(data.user.role === "admin" ? "/admin/dashboard" : "/dashboard")
  }

  const loginWithGitHub = async (code: string) => {
    const data = await apiGitHubCallback(code)
    localStorage.setItem("gnosis_access_token", data.access)
    localStorage.setItem("gnosis_refresh_token", data.refresh)
    setUser(data.user)
    router.push(data.user.role === "admin" ? "/admin/dashboard" : "/dashboard")
  }

  const connectGitHub = async (code: string) => {
    const updatedUser = await apiConnectGitHub(code)
    setUser(updatedUser)
    router.push("/dashboard")
  }

  const logout = () => {
    localStorage.removeItem("gnosis_access_token")
    localStorage.removeItem("gnosis_refresh_token")
    setUser(null)
    router.push("/login")
  }

  const refreshUser = async () => {
    const updated = await apiGetMe()
    setUser(updated)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        loginWithGitHub,
        connectGitHub,
        logout,
        refreshUser,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
