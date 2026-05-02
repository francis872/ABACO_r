import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

// En producción (Vercel) VITE_API_URL = URL del backend en Railway
// En desarrollo el proxy de Vite reenvía /api → localhost:5000
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de petición: adjunta el token JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de respuesta: maneja errores globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido — cerrar sesión
      useAuthStore.getState().cerrarSesion()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
