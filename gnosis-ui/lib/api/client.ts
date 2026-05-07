import axios from "axios"

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
})

// Ensure all requests end with trailing slash to avoid Django 301 redirects
api.interceptors.request.use((config) => {
  if (config.url && !config.url.endsWith("/")) {
    config.url += "/"
  }

  // Attach JWT token if available
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("gnosis_access_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

// Auto-refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const requestUrl = originalRequest?.url || ""

    // Skip auto-refresh/redirect for auth endpoints — let the caller handle the error
    const isAuthEndpoint = requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/signup") ||
      requestUrl.includes("/auth/github/callback") ||
      requestUrl.includes("/auth/github/connect")

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint &&
      typeof window !== "undefined"
    ) {
      originalRequest._retry = true
      const refresh = localStorage.getItem("gnosis_refresh_token")
      if (refresh) {
        try {
          const res = await axios.post("http://127.0.0.1:8000/api/auth/refresh/", {
            refresh,
          })
          localStorage.setItem("gnosis_access_token", res.data.access)
          localStorage.setItem("gnosis_refresh_token", res.data.refresh)
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem("gnosis_access_token")
          localStorage.removeItem("gnosis_refresh_token")
          window.location.href = "/login"
        }
      } else {
        // No refresh token available, force login
        localStorage.removeItem("gnosis_access_token")
        window.location.href = "/login"
      }
    }

    // Handle deactivated account (403 from login/auth)
    if (
      error.response?.status === 403 &&
      error.response?.data?.error?.includes?.("deactivated") &&
      typeof window !== "undefined"
    ) {
      localStorage.removeItem("gnosis_access_token")
      localStorage.removeItem("gnosis_refresh_token")
    }

    return Promise.reject(error)
  }
)