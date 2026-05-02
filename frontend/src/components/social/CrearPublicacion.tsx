/**
 * CrearPublicacion.tsx
 * Formulario para crear una nueva publicación con adjuntos opcionales.
 */

import { useState, useRef } from 'react'
import api from '@/services/api'
import toast from 'react-hot-toast'
import type { Territorio } from '@/types'

interface Props {
  territorios: Territorio[]
}

export default function CrearPublicacion({ territorios }: Props) {
  const [contenido, setContenido]       = useState('')
  const [territorioId, setTerritorioId] = useState('')
  const [archivos, setArchivos]         = useState<File[]>([])
  const [publicando, setPublicando]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const MAX_CHARS = 5000
  const restantes = MAX_CHARS - contenido.length

  const agregarArchivos = (nuevos: FileList | null) => {
    if (!nuevos) return
    const lista = Array.from(nuevos)
    const total = archivos.length + lista.length
    if (total > 4) {
      toast.error('Máximo 4 archivos por publicación')
      return
    }
    setArchivos((prev) => [...prev, ...lista])
  }

  const quitarArchivo = (idx: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== idx)  )
  }

  const publicar = async () => {
    if (!contenido.trim()) return
    setPublicando(true)
    try {
      const formData = new FormData()
      formData.append('contenido', contenido.trim())
      if (territorioId) formData.append('territorio_id', territorioId)
      archivos.forEach((f) => formData.append('adjuntos', f))

      await api.post('/publicaciones', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setContenido('')
      setTerritorioId('')
      setArchivos([])
    } catch {
      toast.error('No se pudo publicar. Intenta de nuevo.')
    } finally {
      setPublicando(false)
    }
  }

  return (
    <div className="border border-white/[0.08] bg-abaco-950 p-5 mb-6">
      {/* Label */}
      <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 font-medium mb-3">
        Nueva publicación
      </p>

      {/* Textarea */}
      <textarea
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        placeholder="¿Qué quieres compartir con el equipo?"
        rows={3}
        maxLength={MAX_CHARS}
        className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/20
                   resize-none focus:outline-none border-b border-white/[0.08] focus:border-white/20
                   pb-2 transition-colors leading-relaxed"
      />

      {/* Opciones secundarias */}
      <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Adjuntar archivo */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-[10px] tracking-[0.15em] uppercase text-white/30 hover:text-white/60 transition-colors"
          >
            + Adjuntar
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => agregarArchivos(e.target.files)}
          />

          {/* Selector de territorio */}
          <select
            value={territorioId}
            onChange={(e) => setTerritorioId(e.target.value)}
            className="bg-transparent text-[10px] tracking-wide text-white/30 border-b border-white/[0.06]
                       focus:outline-none focus:border-white/20 hover:text-white/50 transition-colors cursor-pointer"
          >
            <option value="" className="bg-abaco-900 text-white/60">Sin territorio</option>
            {territorios.map((t) => (
              <option key={t.id} value={t.id} className="bg-abaco-900 text-white/80">
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-[9px] font-mono ${restantes < 200 ? 'text-oro-400/60' : 'text-white/15'}`}>
            {restantes}
          </span>
          <button
            onClick={publicar}
            disabled={publicando || !contenido.trim()}
            className="border border-white text-white text-[10px] tracking-[0.2em] uppercase px-4 py-2
                       hover:bg-white hover:text-black transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            {publicando ? '...' : 'Publicar →'}
          </button>
        </div>
      </div>

      {/* Preview de archivos */}
      {archivos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/[0.06]">
          {archivos.map((f, i) => (
            <div key={i} className="flex items-center gap-2 border border-white/[0.08] px-3 py-1.5 group">
              <span className="text-[9px] font-mono text-white/30 uppercase">
                {f.type.includes('pdf') ? 'PDF' : 'IMG'}
              </span>
              <span className="text-[10px] text-white/50 max-w-[120px] truncate">{f.name}</span>
              <button
                onClick={() => quitarArchivo(i)}
                className="text-white/15 hover:text-red-400/60 transition-colors text-xs ml-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
