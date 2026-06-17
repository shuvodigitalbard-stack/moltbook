import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

interface User {
  id: string
  email: string
  name: string
  role: string
  teamId: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password })
        set({
          user: data.user,
          accessToken: data.tokens.accessToken,
          isAuthenticated: true,
        })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.tokens.accessToken}`
      },

      register: async (name: string, email: string, password: string) => {
        const { data } = await api.post('/auth/register', { name, email, password })
        set({
          user: data.user,
          accessToken: data.tokens.accessToken,
          isAuthenticated: true,
        })
        api.defaults.headers.common['Authorization'] = `Bearer ${data.tokens.accessToken}`
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false })
        delete api.defaults.headers.common['Authorization']
      },

      setTokens: (tokens) => {
        set({ accessToken: tokens.accessToken })
        api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`
      },
    }),
    {
      name: 'moltbook-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
