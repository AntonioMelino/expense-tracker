import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(client(original))
        })
      })
    }

    isRefreshing = true

    try {
      const { accessToken, refreshToken, user, setAuth, logout } = useAuthStore.getState()
      if (!refreshToken || !user) {
        logout()
        return Promise.reject(error)
      }

      const response = await axios.post('/api/auth/refresh', { accessToken, refreshToken })
      const { accessToken: newAccess, refreshToken: newRefresh } = response.data

      setAuth(user, newAccess, newRefresh)
      refreshQueue.forEach((cb) => cb(newAccess))
      refreshQueue = []

      original.headers.Authorization = `Bearer ${newAccess}`
      return client(original)
    } catch {
      useAuthStore.getState().logout()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

export default client
