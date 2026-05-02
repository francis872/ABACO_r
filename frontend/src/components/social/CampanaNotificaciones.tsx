/**
 * CampanaNotificaciones.tsx
 * Ícono de campana en el header con contador de no leídas y dropdown.
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocialStore } from '@/store/socialStore'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'
import type { Notificacion } from '@/types'

const MENSAJES: Record<string, (nombre: string) => string> = {
  like:       (n) => `${n} le dio like a tu publicación`,
  comentario: (n) => `${n} comentó tu publicación`,
}

function formatRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'ahora'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24)   return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function CampanaNotificaciones() {
  const navigate    = useNavigate()
  const token       = useAuthStore((s) => s.token)
  const notifs      = useSocialStore((s) => s.notificaciones)
  const sinLeer     = useSocialStore((s) => s.sinLeer)
  const setNotifs   = useSocialStore((s) => s.setNotificaciones)
  const marcar      = useSocialStore((s) => s.marcarLeidas)

  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Cargar notificaciones al montar
  useEffect(() => {
    if (!token) return
    api.get<{ notificaciones: Notificacion[]; sin_leer: number }>('/publicaciones/notificaciones')
      .then(({ data }) => setNotifs(data.notificaciones, data.sin_leer))
      .catch(() => {})
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const abrir = () => {
    setAbierto((v) => !v)
    if (!abierto && sinLeer > 0) {
      marcar()
      api.patch('/publicaciones/notificaciones/leer').catch(() => {})
    }
  }

  const irAPublicacion = (pubId?: string) => {
    setAbierto(false)
    if (pubId) navigate(`/comunidad?pub=${pubId}`)
    else navigate('/comunidad')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={abrir}
        className="relative flex items-center justify-center w-8 h-8 text-white/30 hover:text-white/70 transition-colors"
        title="Notificaciones"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {sinLeer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-oro-400 text-black text-[8px] font-bold flex items-center justify-center font-mono">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-abaco-950 border border-white/[0.1] z-50 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-medium">
              Notificaciones
            </p>
            <button
              onClick={() => navigate('/comunidad')}
              className="text-[9px] text-white/25 hover:text-white/50 transition-colors tracking-wider uppercase"
            >
              Ver todo
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-center text-[11px] text-white/20 py-8 tracking-wider">
                Sin notificaciones
              </p>
            ) : (
              notifs.slice(0, 15).map((n) => (
                <button
                  key={n.id}
                  onClick={() => irAPublicacion(n.publicacion_id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors flex items-start gap-3
                    ${n.leida ? 'opacity-50' : ''}`}
                >
                  {/* Indicador tipo */}
                  <span className="text-sm mt-0.5 flex-shrink-0">
                    {n.tipo === 'like' ? '♥' : '💬'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/70 leading-snug">
                      {MENSAJES[n.tipo]?.(`${n.actor_nombre} ${n.actor_apellido}`) ?? ''}
                    </p>
                    <p className="text-[9px] text-white/25 mt-0.5 font-mono">
                      {formatRelativo(n.created_at)}
                    </p>
                  </div>
                  {!n.leida && (
                    <div className="w-1.5 h-1.5 bg-oro-400 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
