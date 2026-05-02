/**
 * PublicacionCard.tsx
 * Tarjeta de una publicación: autor, contenido, adjuntos, likes, comentarios.
 */

import { useState } from 'react'
import { useSocialStore } from '@/store/socialStore'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'
import toast from 'react-hot-toast'
import ComentariosSection from './ComentariosSection'
import type { Publicacion } from '@/types'

interface Props {
  publicacion: Publicacion
}

const ROL_BADGE: Record<string, string> = {
  superadmin:  'SUPER',
  admin:       'ADMIN',
  estratega:   'ESTRAT',
  analista:    'ANLT',
  coordinador: 'COORD',
  observador:  'OBS',
}

function iniciales(nombre: string, apellido: string) {
  return `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PublicacionCard({ publicacion: pub }: Props) {
  const usuario       = useAuthStore((s) => s.usuario)
  const eliminarPub   = useSocialStore((s) => s.eliminarPublicacion)
  const actualizarLike = useSocialStore((s) => s.actualizarLike)

  const [mostrarComents, setMostrarComents] = useState(false)
  const [likeOp, setLikeOp] = useState(false) // optimistic lock

  const esAutor = pub.usuario_id === usuario?.id
  const esAdmin = ['admin', 'superadmin'].includes(usuario?.rol ?? '')

  // ── Like optimístico ──────────────────────────────────────────────
  const handleLike = async () => {
    if (likeOp) return
    setLikeOp(true)

    // Actualización optimística
    const nuevoLike  = !pub.yo_di_like
    const nuevoCount = pub.likes + (nuevoLike ? 1 : -1)
    actualizarLike(pub.id, nuevoCount, nuevoLike)

    try {
      const { data } = await api.post<{ likes: number; yo_di_like: boolean }>(
        `/publicaciones/${pub.id}/like`
      )
      actualizarLike(pub.id, data.likes, data.yo_di_like)
    } catch {
      // Revertir
      actualizarLike(pub.id, pub.likes, pub.yo_di_like)
      toast.error('No se pudo registrar el like')
    } finally {
      setLikeOp(false)
    }
  }

  const handleEliminar = async () => {
    if (!window.confirm('¿Eliminar esta publicación?')) return
    try {
      await api.delete(`/publicaciones/${pub.id}`)
    } catch {
      toast.error('No se pudo eliminar la publicación')
    }
  }

  return (
    <article className="border border-white/[0.07] bg-abaco-950 p-5 hover:border-white/[0.12] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 bg-abaco-800 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-mono text-white/50">
              {iniciales(pub.usuario_nombre, pub.usuario_apellido)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {pub.usuario_nombre} {pub.usuario_apellido}
              </span>
              <span className="text-[8px] tracking-[0.2em] text-white/25 font-mono border border-white/[0.08] px-1.5 py-0.5">
                {ROL_BADGE[pub.usuario_rol] ?? pub.usuario_rol.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-white/25">
                {formatFecha(pub.created_at)}
              </span>
              {pub.territorio_nombre && (
                <>
                  <span className="text-white/10">·</span>
                  <span className="text-[10px] text-oro-400/60 tracking-wide">
                    {pub.territorio_nombre}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {(esAutor || esAdmin) && (
          <button
            onClick={handleEliminar}
            className="text-white/15 hover:text-red-400/70 text-xs transition-colors"
            title="Eliminar publicación"
          >
            ✕
          </button>
        )}
      </div>

      {/* Contenido */}
      <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap mb-4">
        {pub.contenido}
      </p>

      {/* Adjuntos */}
      {pub.adjuntos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {pub.adjuntos.map((adj) =>
            adj.tipo === 'imagen' ? (
              <a key={adj.id} href={`http://localhost:5000${adj.url}`} target="_blank" rel="noreferrer">
                <img
                  src={`http://localhost:5000${adj.url}`}
                  alt={adj.nombre_original}
                  className="w-full h-40 object-cover border border-white/[0.08] hover:border-white/20 transition-colors"
                />
              </a>
            ) : (
              <a
                key={adj.id}
                href={`http://localhost:5000${adj.url}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 border border-white/[0.08] p-3 hover:border-white/20 transition-colors group"
              >
                <div className="w-8 h-8 bg-abaco-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] text-white/40 font-mono">PDF</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-white/60 truncate group-hover:text-white/80">
                    {adj.nombre_original}
                  </p>
                  {adj.tamano_bytes && (
                    <p className="text-[9px] text-white/25 mt-0.5">
                      {(adj.tamano_bytes / 1024).toFixed(0)} KB
                    </p>
                  )}
                </div>
              </a>
            )
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-6 pt-2">
        {/* Like */}
        <button
          onClick={handleLike}
          disabled={likeOp}
          className={`flex items-center gap-1.5 text-[11px] tracking-wide transition-colors group
            ${pub.yo_di_like ? 'text-oro-400' : 'text-white/30 hover:text-white/60'}`}
        >
          <span className={`text-base transition-transform group-active:scale-125 ${pub.yo_di_like ? 'drop-shadow-[0_0_4px_theme(colors.oro.400)]' : ''}`}>
            {pub.yo_di_like ? '♥' : '♡'}
          </span>
          <span className="font-mono">{pub.likes}</span>
        </button>

        {/* Comentarios */}
        <button
          onClick={() => setMostrarComents((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors tracking-wide"
        >
          <span className="text-base">💬</span>
          <span className="font-mono">{pub.comentarios}</span>
          <span className="text-[9px] uppercase tracking-[0.15em] ml-1">
            {mostrarComents ? 'Ocultar' : 'Comentar'}
          </span>
        </button>
      </div>

      {/* Sección de comentarios desplegable */}
      {mostrarComents && <ComentariosSection publicacionId={pub.id} />}
    </article>
  )
}
