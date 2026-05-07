import { api } from "./client"

export type AuthUser = {
  id: number
  username: string
  email: string
  role: "admin" | "developer"
  github_connected?: boolean
  github_login?: string
  avatar_url?: string
}

type AuthResponse = {
  access: string
  refresh: string
  user: AuthUser
}

export async function apiSignup(username: string, email: string, password: string): Promise<AuthResponse> {
  const res = await api.post("/auth/signup/", { username, email, password })
  return res.data
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post("/auth/login/", { email, password })
  return res.data
}

export async function apiRefreshToken(refresh: string): Promise<{ access: string; refresh: string }> {
  const res = await api.post("/auth/refresh/", { refresh })
  return res.data
}

export async function apiGetMe(): Promise<AuthUser> {
  const res = await api.get("/auth/me/")
  return res.data
}

export async function apiGetGitHubOAuthUrl(mode: "login" | "connect" = "login"): Promise<string> {
  const res = await api.get("/auth/github/url/", { params: { mode } })
  return res.data.url
}

export async function apiGitHubCallback(code: string): Promise<AuthResponse> {
  const res = await api.post("/auth/github/callback/", { code })
  return res.data
}

export async function apiConnectGitHub(code: string): Promise<AuthUser> {
  const res = await api.post("/auth/github/connect/", { code })
  return res.data
}

export type UpdateProfilePayload = {
  username?: string
  email?: string
  current_password?: string
  new_password?: string
}

export async function apiUpdateProfile(data: UpdateProfilePayload): Promise<AuthUser> {
  const res = await api.post("/auth/profile/update/", data)
  return res.data
}

export async function apiRevokeGitHub(): Promise<void> {
  await api.post("/auth/github/revoke/")
}
