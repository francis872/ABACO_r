import { create } from 'zustand'
import type { Publicacion, Comentario, Notificacion } from '@/types'

interface SocialStore {
  // Feed
  publicaciones: Publicacion[]
  cargandoFeed: boolean
  paginaFeed: number
  hayMas: boolean

  // Comentarios abiertos por publicación
  comentariosPorPub: Record<string, Comentario[]>

  // Notificaciones
  notificaciones: Notificacion[]
  sinLeer: number

  // Acciones de feed
  setPublicaciones: (pubs: Publicacion[], pagina: number, hayMas: boolean) => void
  agregarPublicacion: (pub: Publicacion) => void
  eliminarPublicacion: (id: string) => void
  actualizarLike: (publicacion_id: string, likes: number, yo_di_like: boolean) => void
  setCargandoFeed: (v: boolean) => void

  // Acciones de comentarios
  setComentarios: (pubId: string, comentarios: Comentario[]) => void
  agregarComentario: (comentario: Comentario) => void
  eliminarComentario: (pubId: string, comentId: string) => void

  // Acciones de notificaciones
  setNotificaciones: (notifs: Notificacion[], sinLeer: number) => void
  agregarNotificacion: (notif: Notificacion) => void
  marcarLeidas: () => void
}

export const useSocialStore = create<SocialStore>((set) => ({
  publicaciones: [],
  cargandoFeed: false,
  paginaFeed: 1,
  hayMas: true,
  comentariosPorPub: {},
  notificaciones: [],
  sinLeer: 0,

  setPublicaciones: (pubs, pagina, hayMas) =>
    set((s) => ({
      publicaciones: pagina === 1 ? pubs : [...s.publicaciones, ...pubs],
      paginaFeed: pagina,
      hayMas,
    })),

  agregarPublicacion: (pub) =>
    set((s) => ({ publicaciones: [pub, ...s.publicaciones] })),

  eliminarPublicacion: (id) =>
    set((s) => ({ publicaciones: s.publicaciones.filter((p) => p.id !== id) })),

  actualizarLike: (publicacion_id, likes, yo_di_like) =>
    set((s) => ({
      publicaciones: s.publicaciones.map((p) =>
        p.id === publicacion_id ? { ...p, likes, yo_di_like } : p
      ),
    })),

  setCargandoFeed: (v) => set({ cargandoFeed: v }),

  setComentarios: (pubId, comentarios) =>
    set((s) => ({
      comentariosPorPub: { ...s.comentariosPorPub, [pubId]: comentarios },
    })),

  agregarComentario: (comentario) =>
    set((s) => {
      const prev = s.comentariosPorPub[comentario.publicacion_id] || []
      return {
        publicaciones: s.publicaciones.map((p) =>
          p.id === comentario.publicacion_id
            ? { ...p, comentarios: p.comentarios + 1 }
            : p
        ),
        comentariosPorPub: {
          ...s.comentariosPorPub,
          [comentario.publicacion_id]: [...prev, comentario],
        },
      }
    }),

  eliminarComentario: (pubId, comentId) =>
    set((s) => ({
      publicaciones: s.publicaciones.map((p) =>
        p.id === pubId ? { ...p, comentarios: Math.max(0, p.comentarios - 1) } : p
      ),
      comentariosPorPub: {
        ...s.comentariosPorPub,
        [pubId]: (s.comentariosPorPub[pubId] || []).filter((c) => c.id !== comentId),
      },
    })),

  setNotificaciones: (notificaciones, sinLeer) => set({ notificaciones, sinLeer }),

  agregarNotificacion: (notif) =>
    set((s) => ({
      notificaciones: [notif, ...s.notificaciones],
      sinLeer: s.sinLeer + 1,
    })),

  marcarLeidas: () =>
    set((s) => ({
      notificaciones: s.notificaciones.map((n) => ({ ...n, leida: true })),
      sinLeer: 0,
    })),
}))
