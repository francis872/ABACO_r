import { useEffect, useRef, useState, useCallback } from 'react'
import {
  MapContainer, TileLayer, GeoJSON, CircleMarker, Popup,
  useMapEvents, LayersControl, ZoomControl,
} from 'react-leaflet'
import type { LatLngExpression, Map as LeafletMap } from 'leaflet'
import L from 'leaflet'
import api from '@/services/api'
import { getSocket } from '@/services/socketService'
import { useAuthStore } from '@/store/authStore'
import { formatearFecha } from '@/utils/formato'
import toast from 'react-hot-toast'

// Types
interface TeritorioFeature {
  type: 'Feature'
  properties: {
    id: string; nombre: string; nivel: string; prioridad: number
    poblacion?: number; votantes_censo?: number
  }
  geometry: { type: string; coordinates: number[] | number[][] | number[][][] } | null
}
interface EventoMapa {
  id: string; territorio_id: string; tipo: string; titulo: string
  descripcion?: string; latitud?: number; longitud?: number
  autor_nombre?: string; created_at: string; datos_extra?: Record<string, unknown>
}
interface HeatmapPoint {
  id: string; nombre: string; nivel: string; latitud: string; longitud: string
  total_contactos: number; contactos_activos: number
}
interface UsuarioOnline { socketId: string; nombre: string; latitud: number; longitud: number }

const CENTRO: LatLngExpression = [4.5709, -74.2973]
const PRIORIDAD_COLOR: Record<number, string> = { 1:'#22c55e',2:'#84cc16',3:'#f59e0b',4:'#f97316',5:'#ef4444' }
const TIPO_COLOR: Record<string, string> = { alerta:'#ef4444',reunion:'#3b82f6',evento:'#8b5cf6',encuesta:'#f59e0b',general:'#6b7280' }
const TIPO_ICONO: Record<string, string> = { alerta:'🚨',reunion:'🤝',evento:'📅',encuesta:'📊',general:'📍' }

function ClickMapa({ onClic }: { onClic: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onClic(e.latlng.lat, e.latlng.lng) } })
  return null
}

export default function MapaTiempoReal() {
  const { usuario } = useAuthStore()
  const mapRef = useRef<LeafletMap | null>(null)
  const [geojson, setGeojson] = useState<{ type: string; features: TeritorioFeature[] } | null>(null)
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([])
  const [eventos, setEventos] = useState<EventoMapa[]>([])
  const [eventosLive, setEventosLive] = useState<EventoMapa[]>([])
  const [usuariosOnline, setUsuariosOnline] = useState<UsuarioOnline[]>([])
  const [totalOnline, setTotalOnline] = useState(0)
  const [territorioSel, setTerritorioSel] = useState<TeritorioFeature['properties'] | null>(null)
  const [filtroNivel, setFiltroNivel] = useState('')
  const [capas, setCapas] = useState({ territorios: true, heatmap: true, eventos: true, usuarios: true })
  const [modoEvento, setModoEvento] = useState(false)
  const [puntoEvento, setPuntoEvento] = useState<{ lat: number; lng: number } | null>(null)
  const [formEvento, setFormEvento] = useState({ tipo: 'general', titulo: '', descripcion: '' })
  const [panelTab, setPanelTab] = useState<'territorios' | 'eventos' | 'online'>('territorios')
  const [cargando, setCargando] = useState(false)

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const [geoRes, heatRes, evtRes] = await Promise.all([
        api.get('/mapa/geojson', { params: { nivel: filtroNivel || undefined } }),
        api.get('/mapa/heatmap'),
        api.get('/mapa/eventos', { params: { limite: 30 } }),
      ])
      setGeojson(geoRes.data.geojson)
      setHeatmap(heatRes.data.heatmap)
      setEventos(evtRes.data.eventos)
    } catch { toast.error('Error al cargar datos del mapa') }
    finally { setCargando(false) }
  }, [filtroNivel])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  useEffect(() => {
    const socket = getSocket()
    socket.on('nuevo_evento', (e: EventoMapa) => {
      setEventosLive(p => [e, ...p].slice(0, 50))
      setEventos(p => [e, ...p].slice(0, 100))
      toast(`${TIPO_ICONO[e.tipo] || '📍'} ${e.titulo}`, { duration: 4000 })
    })
    socket.on('usuarios_online', ({ total }: { total: number }) => setTotalOnline(total))
    socket.on('posicion_usuario', (d: UsuarioOnline) => {
      setUsuariosOnline(p => {
        const idx = p.findIndex(u => u.socketId === d.socketId)
        if (idx >= 0) { const n = [...p]; n[idx] = d; return n }
        return [...p, d].slice(0, 20)
      })
    })
    socket.on('usuario_salio', ({ nombre }: { nombre: string }) => {
      setUsuariosOnline(p => p.filter(u => u.nombre !== nombre))
    })
    socket.on('territorio_actualizado', () => cargarDatos())
    return () => {
      socket.off('nuevo_evento'); socket.off('usuarios_online')
      socket.off('posicion_usuario'); socket.off('usuario_salio')
      socket.off('territorio_actualizado')
    }
  }, [cargarDatos])

  useEffect(() => {
    if (!territorioSel) return
    const socket = getSocket()
    socket.emit('unirse_territorio', { territorioId: territorioSel.id })
    socket.emit('solicitar_stats', { territorioId: territorioSel.id })
  }, [territorioSel])

  const publicarEvento = () => {
    if (!formEvento.titulo.trim()) return toast.error('El título es obligatorio')
    if (!territorioSel) return toast.error('Selecciona un territorio primero')
    const socket = getSocket()
    socket.emit('publicar_evento', {
      territorioId: territorioSel.id, ...formEvento,
      latitud: puntoEvento?.lat, longitud: puntoEvento?.lng,
    })
    setFormEvento({ tipo: 'general', titulo: '', descripcion: '' })
    setPuntoEvento(null); setModoEvento(false)
    toast.success('Evento publicado en tiempo real')
  }

  const estiloFeature = (feature?: TeritorioFeature) => {
    const p = feature?.properties?.prioridad ?? 3
    const sel = feature?.properties?.id === territorioSel?.id
    return {
      color: sel ? '#f59e0b' : PRIORIDAD_COLOR[p] || '#6b7280',
      weight: sel ? 3 : 1.5, fillOpacity: sel ? 0.35 : 0.15,
      fillColor: PRIORIDAD_COLOR[p] || '#6b7280',
    }
  }

  const onCadaFeature = (feature: TeritorioFeature, layer: L.Layer) => {
    const p = feature.properties
    layer.on({
      click: () => setTerritorioSel(p),
      mouseover: (e) => (e.target as L.Path).setStyle({ fillOpacity: 0.45, weight: 2.5 }),
      mouseout: (e) => (e.target as L.Path).setStyle(estiloFeature(feature)),
    })
  }

  const todoEventos = [...eventosLive, ...eventos.filter(e => !eventosLive.find(l => l.id === e.id))]

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 bg-gray-900">
      {/* Panel lateral */}
      <div className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-semibold text-sm">Mapa Territorial</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-green-400 text-xs">{totalOnline} en línea</span>
            </div>
          </div>
          <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}
            className="w-full bg-gray-800 text-gray-200 text-xs rounded px-2 py-1.5 border border-gray-600">
            <option value="">Todos los niveles</option>
            {['pais','departamento','municipio','localidad','barrio','mesa'].map(n => (
              <option key={n} value={n} className="capitalize">{n.charAt(0).toUpperCase()+n.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="flex border-b border-gray-700 text-xs">
          {(['territorios','eventos','online'] as const).map(t => (
            <button key={t} onClick={() => setPanelTab(t)}
              className={`flex-1 py-2 transition-colors ${panelTab===t ? 'text-yellow-400 border-b-2 border-yellow-400 bg-gray-800' : 'text-gray-400 hover:text-gray-200'}`}>
              {t==='territorios' ? '🗺️ Territorios' : t==='eventos' ? '📡 En vivo' : '👥 Online'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto text-xs">
          {panelTab === 'territorios' && (
            <div>
              {cargando && <div className="p-4 text-center text-gray-500">Cargando...</div>}
              {geojson?.features.map(f => (
                <div key={f.properties.id} onClick={() => {
                  setTerritorioSel(f.properties)
                  if (f.geometry?.type === 'Point') {
                    const [lng, lat] = f.geometry.coordinates as number[]
                    mapRef.current?.setView([lat, lng], 10)
                  }
                }} className={`px-3 py-2.5 border-b border-gray-800 cursor-pointer transition-colors ${territorioSel?.id === f.properties.id ? 'bg-yellow-900/30 border-l-2 border-l-yellow-400' : 'hover:bg-gray-800'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-100 font-medium truncate">{f.properties.nombre}</span>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 ml-1" style={{ background: PRIORIDAD_COLOR[f.properties.prioridad] }} />
                  </div>
                  <div className="text-gray-500 mt-0.5 flex items-center gap-2">
                    <span className="capitalize">{f.properties.nivel}</span>
                    {f.properties.votantes_censo && <span>· {f.properties.votantes_censo.toLocaleString()} votantes</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {panelTab === 'eventos' && (
            <div>
              <div className="p-2 border-b border-gray-700">
                <button onClick={() => setModoEvento(!modoEvento)}
                  className={`w-full py-1.5 rounded text-xs font-medium transition-colors ${modoEvento ? 'bg-yellow-600 text-black' : 'bg-abaco-600 text-white hover:bg-abaco-700'}`}>
                  {modoEvento ? '✕ Cancelar' : '+ Publicar evento'}
                </button>
                {modoEvento && (
                  <div className="mt-2 space-y-1.5">
                    <select value={formEvento.tipo} onChange={e => setFormEvento(p=>({...p,tipo:e.target.value}))}
                      className="w-full bg-gray-800 text-gray-200 rounded px-2 py-1 border border-gray-600">
                      <option value="general">📍 General</option>
                      <option value="alerta">🚨 Alerta</option>
                      <option value="reunion">🤝 Reunión</option>
                      <option value="evento">📅 Evento</option>
                      <option value="encuesta">📊 Encuesta</option>
                    </select>
                    <input placeholder="Título *" value={formEvento.titulo}
                      onChange={e => setFormEvento(p=>({...p,titulo:e.target.value}))}
                      className="w-full bg-gray-800 text-gray-200 rounded px-2 py-1 border border-gray-600 placeholder-gray-600" />
                    <textarea placeholder="Descripción (opcional)" value={formEvento.descripcion}
                      onChange={e => setFormEvento(p=>({...p,descripcion:e.target.value}))} rows={2}
                      className="w-full bg-gray-800 text-gray-200 rounded px-2 py-1 border border-gray-600 placeholder-gray-600 resize-none" />
                    {puntoEvento
                      ? <p className="text-green-400">📌 {puntoEvento.lat.toFixed(4)}, {puntoEvento.lng.toFixed(4)}</p>
                      : <p className="text-gray-500 italic">Haz click en el mapa para ubicar</p>}
                    <button onClick={publicarEvento}
                      className="w-full bg-green-700 hover:bg-green-600 text-white py-1.5 rounded font-medium transition-colors">
                      Publicar ahora
                    </button>
                  </div>
                )}
              </div>
              {eventosLive.length > 0 && (
                <div className="px-2 py-1 bg-green-900/20 border-b border-gray-700">
                  <span className="text-green-400 font-semibold">● NUEVOS ({eventosLive.length})</span>
                </div>
              )}
              {todoEventos.map(e => (
                <div key={e.id} className="px-3 py-2 border-b border-gray-800 hover:bg-gray-800">
                  <div className="flex items-start gap-1.5">
                    <span className="text-base leading-none mt-0.5">{TIPO_ICONO[e.tipo]||'📍'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-100 font-medium truncate">{e.titulo}</p>
                      {e.descripcion && <p className="text-gray-500 truncate">{e.descripcion}</p>}
                      <div className="text-gray-600 mt-0.5 flex gap-2">
                        <span>{e.autor_nombre||'Sistema'}</span><span>·</span>
                        <span>{formatearFecha(e.created_at)}</span>
                      </div>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: TIPO_COLOR[e.tipo]||'#6b7280' }} />
                  </div>
                </div>
              ))}
              {eventos.length === 0 && !cargando && <p className="p-4 text-center text-gray-600">Sin eventos registrados</p>}
            </div>
          )}

          {panelTab === 'online' && (
            <div>
              <div className="px-3 py-2 border-b border-gray-700 text-gray-400">
                {totalOnline} usuario{totalOnline!==1?'s':''} conectado{totalOnline!==1?'s':''}
              </div>
              {usuariosOnline.length === 0
                ? <p className="p-4 text-center text-gray-600">Solo tú en este territorio</p>
                : usuariosOnline.map(u => (
                  <div key={u.socketId} className="px-3 py-2 border-b border-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-gray-200">{u.nombre}</span>
                    <span className="text-gray-600 ml-auto">{u.latitud?.toFixed(2)}, {u.longitud?.toFixed(2)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {territorioSel && (
          <div className="border-t border-gray-700 p-3 bg-gray-800">
            <div className="flex items-center justify-between mb-1">
              <p className="text-yellow-400 font-semibold text-sm truncate">{territorioSel.nombre}</p>
              <button onClick={() => setTerritorioSel(null)} className="text-gray-500 hover:text-gray-300 ml-1">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
              <span>Nivel: <b className="text-gray-200 capitalize">{territorioSel.nivel}</b></span>
              <span>Prioridad: <b className="text-gray-200">{territorioSel.prioridad}/5</b></span>
              {territorioSel.poblacion && <span>Pob.: <b className="text-gray-200">{territorioSel.poblacion.toLocaleString()}</b></span>}
              {territorioSel.votantes_censo && <span>Votantes: <b className="text-gray-200">{territorioSel.votantes_censo.toLocaleString()}</b></span>}
            </div>
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        <div className="absolute top-3 right-3 z-[1000] bg-gray-900/90 backdrop-blur rounded-lg p-2 shadow-xl border border-gray-700 text-xs space-y-1">
          <p className="text-gray-400 font-semibold mb-1">Capas</p>
          {(Object.keys(capas) as Array<keyof typeof capas>).map(k => (
            <label key={k} className="flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white">
              <input type="checkbox" checked={capas[k]} onChange={e => setCapas(p=>({...p,[k]:e.target.checked}))} className="accent-yellow-400" />
              <span className="capitalize">{k}</span>
            </label>
          ))}
        </div>

        {modoEvento && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-500 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
            🖱️ Haz click en el mapa para ubicar el evento
          </div>
        )}

        <MapContainer center={CENTRO} zoom={6}
          style={{ height: '100%', width: '100%', background: '#0f172a' }}
          zoomControl={false} ref={mapRef}>
          <ZoomControl position="bottomright" />
          <ClickMapa onClic={(lat, lng) => { if (modoEvento) setPuntoEvento({ lat, lng }) }} />

          <LayersControl position="bottomright">
            <LayersControl.BaseLayer checked name="Dark (CartoDB)">
              <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satélite (Esri)">
              <TileLayer attribution="&copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="OpenStreetMap">
              <TileLayer attribution='&copy; OpenStreetMap'
                url="https://{z}/{x}/{y}.png" />
            </LayersControl.BaseLayer>
          </LayersControl>

          {capas.territorios && geojson && (
            <GeoJSON key={filtroNivel + (territorioSel?.id||'')}
              data={geojson as GeoJSON.FeatureCollection}
              style={(f) => estiloFeature(f as TeritorioFeature)}
              onEachFeature={(f, l) => onCadaFeature(f as TeritorioFeature, l)} />
          )}

          {capas.heatmap && heatmap.map(p => {
            if (!p.latitud || !p.longitud) return null
            const r = Math.max(6, Math.min(30, (p.total_contactos||0) * 1.5))
            return (
              <CircleMarker key={p.id} center={[parseFloat(p.latitud), parseFloat(p.longitud)]} radius={r}
                pathOptions={{ color:'#f59e0b', fillColor:'#f59e0b', fillOpacity:0.25, weight:1 }}>
                <Popup><div className="text-xs"><p className="font-bold">{p.nombre}</p><p>👥 {p.total_contactos} contactos</p><p>✅ {p.contactos_activos} activos</p></div></Popup>
              </CircleMarker>
            )
          })}

          {capas.eventos && todoEventos.filter(e => e.latitud && e.longitud).map(e => (
            <CircleMarker key={e.id} center={[e.latitud!, e.longitud!]} radius={8}
              pathOptions={{ color:TIPO_COLOR[e.tipo]||'#6b7280', fillColor:TIPO_COLOR[e.tipo]||'#6b7280', fillOpacity:0.8, weight:2 }}>
              <Popup><div className="text-xs min-w-[160px]">
                <p className="font-bold">{TIPO_ICONO[e.tipo]} {e.titulo}</p>
                {e.descripcion && <p className="text-gray-600 mt-1">{e.descripcion}</p>}
                <p className="text-gray-500 mt-1">{e.autor_nombre} · {formatearFecha(e.created_at)}</p>
              </div></Popup>
            </CircleMarker>
          ))}

          {puntoEvento && (
            <CircleMarker center={[puntoEvento.lat, puntoEvento.lng]} radius={10}
              pathOptions={{ color:'#f59e0b', fillColor:'#f59e0b', fillOpacity:0.9, weight:2 }} />
          )}

          {capas.usuarios && usuariosOnline.map(u => (
            <CircleMarker key={u.socketId} center={[u.latitud, u.longitud]} radius={7}
              pathOptions={{ color:'#22c55e', fillColor:'#22c55e', fillOpacity:0.9, weight:2 }}>
              <Popup><span className="text-xs">👤 {u.nombre}</span></Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
