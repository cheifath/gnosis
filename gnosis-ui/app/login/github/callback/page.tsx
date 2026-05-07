"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2, Shield } from "lucide-react"

export default function GitHubCallbackPage() {
  const searchParams = useSearchParams()
  const { loginWithGitHub, connectGitHub } = useAuth()
  const [error, setError] = useState("")
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (!code) {
      setError("No authorization code received from GitHub.")
      return
    }

    if (state === "connect") {
      // User is linking GitHub to their existing account
      connectGitHub(code).catch((err) => {
        const msg = err?.response?.data?.error || "Failed to connect GitHub account. Please try again."
        setError(msg)
        processed.current = false
      })
    } else {
      // User is logging in / signing up via GitHub
      loginWithGitHub(code).catch((err) => {
        const msg = err?.response?.data?.error || "Failed to authenticate with GitHub. Please try again."
        setError(msg)
        processed.current = false
      })
    }
  }, [searchParams, loginWithGitHub, connectGitHub])

  const state = searchParams.get("state")
  const isConnect = state === "connect"

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center max-w-md px-4">
        <Shield className="text-purple-400 mx-auto mb-4" size={40} />
        {error ? (
          <div>
            <p className="text-red-400 mb-4">{error}</p>
            <a
              href={isConnect ? "/connect-github" : "/login"}
              className="text-purple-400 hover:text-purple-300"
            >
              {isConnect ? "Back to Connect GitHub" : "Back to login"}
            </a>
          </div>
        ) : (
          <div>
            <Loader2 className="animate-spin text-purple-400 mx-auto mb-4" size={32} />
            <p className="text-slate-400">
              {isConnect ? "Connecting your GitHub account..." : "Authenticating with GitHub..."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
