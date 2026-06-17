/// <reference types="vite/client" />

import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('moltbook-auth')
  if (token) {
    try {
      const state = JSON.parse(token)
      if (state?.state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.state.accessToken}`
      }
    } catch {
      // ignore
    }
  }
  return config
})

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('moltbook-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
