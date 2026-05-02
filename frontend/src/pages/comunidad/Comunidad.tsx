/**
 * Comunidad.tsx
 * Feed social principal — publicaciones, likes y comentarios entre usuarios.
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '@/services/api'
import { useSocialStore } from '@/store/socialStore'
import PublicacionCard from '@/components/social/PublicacionCard'
import CrearPublicacion from '@/components/social/CrearPublicacion'
import type { Publicacion, Territorio } from '@/types'

export default function Comunidad() {
  const [searchParams] = useSearchParams()

  const publicaciones  = useSocialStore((s) => s.publicaciones)
  const cargando       = useSocialStore((s) => s.cargandoFeed)
  const hayMas         = useSocialStore((s) => s.hayMas)
  const paginaFeed     = useSocialStore((s) => s.paginaFeed)
  const setPublicaciones = useSocialStore((s) => s.setPublicaciones)
  const setCargando    = useSocialStore((s) => s.setCargandoFeed)

  const [territorios, setTerritorios] = useState<Territorio[]>([])
  const [filtroTerr, setFiltroTerr]   = useState('')

  // Cargar lista de territorios para el filtro
  useEffect(() => {
    api.get<{ territorios: Territorio[] }>('/territorio?limite=50')
      .then(({ data }) => setTerritorios(data.territorios ?? []))
      .catch(() => {})
  }, [])

  const cargarFeed = useCallback(async (pagina = 1) => {
    setCargando(true)
    try {
      const params: Record<string, string> = { pagina: String(pagina), limite: '15' }
      if (filtroTerr) params.territorio_id = filtroTerr

      const { data } = await api.get<{
        publicaciones: Publicacion[]
        pagina: number
        limite: number
      }>('/publicaciones', { params })

      const hayMasItems = data.publicaciones.length >= data.limite
      setPublicaciones(data.publicaciones, pagina, hayMasItems)
    } catch {
      // silencioso — el error general se muestra en el layout
    } finally {
      setCargando(false)
    }
  }, [filtroTerr]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar al montar y al cambiar filtro
  useEffect(() => {
    cargarFeed(1)
  }, [cargarFeed])

  const cargarMas = () => {
    if (!cargando && hayMas) cargarFeed(paginaFeed + 1)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header de sección */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[9px] tracking-[0.3em] uppercase text-white/25 mb-1 font-medium">
            Módulo
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Comunidad</h1>
        </div>

        {/* Filtro por territorio */}
        <div className="flex items-center gap-3">
          <label className="text-[9px] tracking-[0.2em] uppercase text-white/25">
            Territorio
          </label>
          <select
            value={filtroTerr}
            onChange={(e) => setFiltroTerr(e.target.value)}
            className="bg-transparent text-[10px] text-white/50 border-b border-white/[0.08]
                       focus:outline-none focus:border-white/25 hover:text-white/70 transition-colors cursor-pointer"
          >
            <option value="" className="bg-abaco-900">Todos</option>
            {territorios.map((t) => (
              <option key={t.id} value={t.id} className="bg-abaco-900">
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Crear publicación */}
      <CrearPublicacion territorios={territorios} />

      {/* Feed */}
      <div className="space-y-4">
        {publicaciones.length === 0 && !cargando && (
          <div className="border border-white/[0.06] p-12 text-center">
            <p className="text-white/20 text-sm tracking-wider">
              Sin publicaciones aún.
            </p>
            <p className="text-white/10 text-xs mt-2 tracking-wide">
              Sé el primero en compartir algo con el equipo.
            </p>
          </div>
        )}

        {publicaciones.map((pub) => (
          <PublicacionCard key={pub.id} publicacion={pub} />
        ))}

        {/* Cargar más */}
        {hayMas && publicaciones.length > 0 && (
          <div className="text-center pt-4">
            <button
              onClick={cargarMas}
              disabled={cargando}
              className="text-[10px] tracking-[0.2em] uppercase text-white/30 hover:text-white/60
                         border border-white/[0.08] hover:border-white/20 px-6 py-3 transition-colors
                         disabled:opacity-20"
            >
              {cargando ? 'Cargando...' : 'Cargar más →'}
            </button>
          </div>
        )}

        {cargando && publicaciones.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-white/[0.05] bg-abaco-950 p-5 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-9 h-9 bg-white/[0.04]" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 bg-white/[0.04] w-1/3" />
                    <div className="h-2 bg-white/[0.03] w-1/5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-white/[0.04] w-full" />
                  <div className="h-3 bg-white/[0.04] w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
