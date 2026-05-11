import { api } from "./client"

// ─── Types ─────────────────────────────────────────────────────

export type AdminDashboardStats = {
  total_prs: number
  completed_prs: number
  failed_prs: number
  processing_prs: number
  total_users: number
  admin_users: number
  developer_users: number
  total_repos: number
  active_repos: number
  total_issues: number
  total_fixes: number
  github_connected_users: number
  pr_trends: { date: string; count: number }[]
  tool_distribution: { tool: string; count: number }[]
  recent_errors: {
    id: number
    pr_number: number
    title: string
    repository: string
    updated_at: string
  }[]
}

export type AdminUser = {
  id: number
  username: string
  email: string
  role: "admin" | "developer"
  is_active: boolean
  github_connected: boolean
  github_login: string | null
  avatar_url: string | null
  total_prs: number
  date_joined: string
  last_login: string | null
}

export type AdminUserDetail = AdminUser & {
  repositories: { id: number; name: string; is_active: boolean }[]
  recent_prs: {
    id: number
    pr_number: number
    title: string
    status: string
    repository: string
    created_at: string
  }[]
}

export type AdminPR = {
  id: number
  repository: string
  repository_id: number
  pr_number: number
  title: string
  author: string
  status: string
  files_count: number
  issues_count: number
  confidence: number | null
  created_at: string
  updated_at: string
}

export type AdminLog = {
  id: number
  action_type: string
  actor: string
  actor_id: number | null
  timestamp: string
  details: Record<string, unknown>
}

export type GitHubAppSettings = {
  github_app_id: string
  github_installation_id: string
  github_pem_path: string
  enable_llm_analysis: boolean
  enable_tool_backed_analysis: boolean
  connected_repos: {
    id: number
    name: string
    installation_id: string
    created_at: string
  }[]
}

export type PlatformSettings = {
  enable_llm_analysis: boolean
  enable_tool_backed_analysis: boolean
  default_repositories: string[]
  github_app_id: string
  github_installation_id: string
  github_pem_path: string
}

// ─── API Functions ─────────────────────────────────────────────

export async function apiAdminDashboard(): Promise<AdminDashboardStats> {
  const res = await api.get("/admin/dashboard/")
  return res.data
}

export async function apiAdminListUsers(): Promise<{ results: AdminUser[] }> {
  const res = await api.get("/admin/users/")
  return res.data
}

export async function apiAdminGetUser(userId: number): Promise<AdminUserDetail> {
  const res = await api.get(`/admin/users/${userId}/`)
  return res.data
}

export async function apiAdminUpdateUser(
  userId: number,
  data: { role?: string; is_active?: boolean; revoke_github?: boolean }
): Promise<{ status: string }> {
  const res = await api.patch(`/admin/users/${userId}/update/`, data)
  return res.data
}

export async function apiAdminDeleteUser(userId: number): Promise<{ status: string }> {
  const res = await api.delete(`/admin/users/${userId}/`)
  return res.data
}

export async function apiAdminListPRs(params?: {
  status?: string
  repository?: string
  search?: string
}): Promise<{ results: AdminPR[] }> {
  const res = await api.get("/admin/prs/", { params })
  return res.data
}

export async function apiAdminRetriggerPR(prId: number): Promise<{ status: string }> {
  const res = await api.post(`/admin/prs/${prId}/retrigger/`)
  return res.data
}

export async function apiAdminListLogs(params?: {
  action_type?: string
  actor?: string
  date_from?: string
  date_to?: string
}): Promise<{ results: AdminLog[] }> {
  const res = await api.get("/admin/logs/", { params })
  return res.data
}

export async function apiAdminGetGitHubApp(): Promise<GitHubAppSettings> {
  const res = await api.get("/admin/github-app/")
  return res.data
}

export async function apiAdminUpdateGitHubApp(
  data: Partial<Pick<GitHubAppSettings, "github_app_id" | "github_installation_id" | "github_pem_path">>
): Promise<{ status: string }> {
  const res = await api.post("/admin/github-app/update/", data)
  return res.data
}

export async function apiAdminTestGitHubConnection(): Promise<{ status: string; message: string }> {
  const res = await api.post("/admin/github-app/test/")
  return res.data
}

export async function apiAdminGetPlatformSettings(): Promise<PlatformSettings> {
  const res = await api.get("/admin/settings/")
  return res.data
}

export async function apiAdminUpdatePlatformSettings(
  data: Partial<PlatformSettings>
): Promise<{ status: string }> {
  const res = await api.post("/admin/settings/update/", data)
  return res.data
}
