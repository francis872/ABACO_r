import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario } from '@/types'

interface AuthStore {
  usuario: Usuario | null
  token: string | null
  autenticado: boolean
  establecerSesion: (usuario: Usuario, token: string) => void
  cerrarSesion: () => void
  actualizarUsuario: (usuario: Partial<Usuario>) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      usuario:      null,
      token:        null,
      autenticado:  false,

      establecerSesion: (usuario, token) => set({
        usuario,
        token,
        autenticado: true,
      }),

      cerrarSesion: () => set({
        usuario:     null,
        token:       null,
        autenticado: false,
      }),

      actualizarUsuario: (datos) => set((state) => ({
        usuario: state.usuario ? { ...state.usuario, ...datos } : null,
      })),
    }),
    {
      name: 'abaco-auth',
      // Solo persiste token y datos básicos del usuario
      partialize: (state) => ({
        token:       state.token,
        usuario:     state.usuario,
        autenticado: state.autenticado,
      }),
    }
  )
)
