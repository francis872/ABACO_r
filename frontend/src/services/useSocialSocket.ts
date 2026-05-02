/**
 * useSocialSocket.ts
 * Hook que gestiona la conexión WebSocket al namespace /social.
 * Se monta una vez (en Layout) y distribuye eventos al socialStore.
 */

import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/authStore'
import { useSocialStore } from '@/store/socialStore'
import type { Publicacion, Comentario, Notificacion } from '@/types'

export function useSocialSocket() {
  const token     = useAuthStore((s) => s.token)
  const socketRef = useRef<Socket | null>(null)

  const agregarPublicacion  = useSocialStore((s) => s.agregarPublicacion)
  const eliminarPublicacion = useSocialStore((s) => s.eliminarPublicacion)
  const actualizarLike      = useSocialStore((s) => s.actualizarLike)
  const agregarComentario   = useSocialStore((s) => s.agregarComentario)
  const eliminarComentario  = useSocialStore((s) => s.eliminarComentario)
  const agregarNotificacion = useSocialStore((s) => s.agregarNotificacion)

  useEffect(() => {
    if (!token) return

    const BACKEND = import.meta.env.VITE_API_URL
      || `${window.location.protocol}//${window.location.hostname}:5000`

    const socket = io(`${BACKEND}/social`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }
    )
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Social] Conectado:', socket.id)
    })

    socket.on('connect_error', (err) => {
      console.error('[Social] Error de conexión:', err.message)
    })

    // ── Eventos del feed ──────────────────────────────────────────
    socket.on('nueva_publicacion', (pub: Publicacion) => {
      agregarPublicacion(pub)
    })

    socket.on('publicacion_eliminada', ({ id }: { id: string }) => {
      eliminarPublicacion(id)
    })

    socket.on('like_actualizado', (payload: {
      publicacion_id: string
      likes: number
      yo_di_like: boolean
    }) => {
      // yo_di_like aquí refleja el estado del usuario que hizo la acción,
      // no necesariamente del usuario actual; el store solo actualiza el conteo.
      // El estado personal (yo_di_like) se gestiona en toggleLike optimistic.
      actualizarLike(payload.publicacion_id, payload.likes, payload.yo_di_like)
    })

    socket.on('nuevo_comentario', (comentario: Comentario) => {
      agregarComentario(comentario)
    })

    socket.on('comentario_eliminado', (payload: {
      publicacion_id: string
      comentario_id: string
    }) => {
      eliminarComentario(payload.publicacion_id, payload.comentario_id)
    })

    // ── Notificaciones privadas ───────────────────────────────────
    socket.on('nueva_notificacion', (notif: Notificacion) => {
      agregarNotificacion(notif)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef
}
