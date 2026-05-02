/**
 * ComentariosSection.tsx
 * Lista y formulario de comentarios para una publicación.
 */

import { useState, useEffect } from 'react'
import { useSocialStore } from '@/store/socialStore'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'
import toast from 'react-hot-toast'
import type { Comentario } from '@/types'

interface Props {
  publicacionId: string
}

function iniciales(nombre: string, apellido: string) {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
}

export default function ComentariosSection({ publicacionId }: Props) {
  const usuario         = useAuthStore((s) => s.usuario)
  const comentariosPub  = useSocialStore((s) => s.comentariosPorPub[publicacionId])
  const setComentarios  = useSocialStore((s) => s.setComentarios)
  const eliminarComent  = useSocialStore((s) => s.eliminarComentario)

  const [texto, setTexto]       = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cargando, setCargando] = useState(false)

  // Cargar comentarios si aún no están en el store
  useEffect(() => {
    if (comentariosPub !== undefined) return
    setCargando(true)
    api.get<{ comentarios: Comentario[] }>(`/publicaciones/${publicacionId}/comentarios`)
      .then(({ data }) => setComentarios(publicacionId, data.comentarios))
      .catch(() => toast.error('No se pudieron cargar los comentarios'))
      .finally(() => setCargando(false))
  }, [publicacionId]) // eslint-disable-line react-hooks/exhaustive-deps

  const enviar = async () => {
    if (!texto.trim()) return
    setEnviando(true)
    try {
      await api.post(`/publicaciones/${publicacionId}/comentarios`, { contenido: texto.trim() })
      setTexto('')
    } catch {
      toast.error('Error al enviar el comentario')
    } finally {
      setEnviando(false)
    }
  }

  const eliminar = async (comentId: string) => {
    try {
      await api.delete(`/publicaciones/${publicacionId}/comentarios/${comentId}`)
    } catch {
      toast.error('No se pudo eliminar el comentario')
    }
  }

  const comentarios = comentariosPub ?? []

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.07] space-y-3">
      {/* Lista */}
      {cargando ? (
        <p className="text-[11px] text-white/25 tracking-wider">Cargando...</p>
      ) : (
        comentarios.map((c) => (
          <div key={c.id} className="flex gap-3 group">
            {/* Avatar */}
            <div className="w-7 h-7 bg-abaco-800 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-mono text-white/50">
                {iniciales(c.usuario_nombre, c.usuario_apellido)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-medium text-white/80">
                  {c.usuario_nombre} {c.usuario_apellido}
                </span>
                <span className="text-[9px] text-white/25 font-mono">
                  {new Date(c.created_at).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{c.contenido}</p>
            </div>

            {/* Eliminar */}
            {(c.usuario_id === usuario?.id || ['admin', 'superadmin'].includes(usuario?.rol ?? '')) && (
              <button
                onClick={() => eliminar(c.id)}
                className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400/70 text-[10px] transition-all self-start pt-0.5"
                title="Eliminar"
              >
                ✕
              </button>
            )}
          </div>
        ))
      )}

      {/* Input para escribir */}
      <div className="flex gap-2 pt-1">
        <div className="w-7 h-7 bg-oro-400/10 border border-oro-400/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-mono text-oro-400">
            {usuario ? iniciales(usuario.nombre, usuario.apellido ?? '') : '?'}
          </span>
        </div>
        <div className="flex-1 flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviar()}
            placeholder="Escribe un comentario..."
            maxLength={2000}
            className="flex-1 bg-transparent border-b border-white/10 focus:border-white/30 text-xs text-white placeholder:text-white/20 focus:outline-none py-1 transition-colors"
          />
          <button
            onClick={enviar}
            disabled={enviando || !texto.trim()}
            className="text-[10px] tracking-[0.15em] uppercase text-white/40 hover:text-white disabled:opacity-20 transition-colors"
          >
            {enviando ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
