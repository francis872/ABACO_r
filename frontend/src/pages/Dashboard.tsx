import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '@/services/api'
import { useSocialStore } from '@/store/socialStore'
import type { ResumenDashboard, Alerta, Tarea, Publicacion } from '@/types'
import { formatearPeso, formatearFecha } from '@/utils/formato'

const COLORES_SEVERIDAD: Record<string, string> = {
  critica: '#ef4444', alta: '#f97316', media: '#f59e0b', baja: '#22c55e',
}

const COLORES_GRAFICOS = ['#1d4ed8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

function TarjetaKPI({ titulo, valor, subtitulo, color }: {
  titulo: string; valor: string | number; subtitulo?: string; color?: string;
}) {
  return (
    <div className="tarjeta p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{titulo}</p>
      <p className={`text-3xl font-bold mt-1 ${color || 'text-abaco-800'}`}>{valor}</p>
      {subtitulo && <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null)
  const [cargando, setCargando] = useState(true)
  const [pubsRecientes, setPubsRecientes] = useState<Publicacion[]>([])
  const sinLeer = useSocialStore((s) => s.sinLeer)

  useEffect(() => {
    api.get('/dashboard/resumen')
      .then(({ data }) => setResumen(data.resumen))
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    api.get<{ publicaciones: Publicacion[] }>('/publicaciones', { params: { pagina: 1, limite: 3 } })
      .then(({ data }) => setPubsRecientes(data.publicaciones ?? []))
      .catch(() => {})
  }, [])

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-abaco-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Cargando inteligencia...</p>
        </div>
      </div>
    )
  }

  if (!resumen) return null

  const fin = resumen.financiero
  const balanceColor = (fin.total_ingresos - fin.total_egresos) >= 0 ? 'text-emerald-600' : 'text-red-600'

  // Datos para el gráfico de estado de tareas
  const datosTareas = [
    { nombre: 'Pendientes', valor: resumen.tareas.pendientes, color: '#f59e0b' },
    { nombre: 'En progreso', valor: resumen.tareas.en_progreso, color: '#3b82f6' },
    { nombre: 'Completadas', valor: resumen.tareas.completadas, color: '#10b981' },
  ].filter((d) => d.valor > 0)

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaKPI
          titulo="Contactos Registrados"
          valor={resumen.contactos?.total ?? 0}
          subtitulo={`${resumen.contactos?.voluntarios ?? 0} voluntarios · ${resumen.contactos?.lideres ?? 0} líderes`}
        />
        <TarjetaKPI
          titulo="Balance Financiero"
          valor={formatearPeso(fin.total_ingresos - fin.total_egresos)}
          subtitulo={`${fin.total_transacciones} transacciones`}
          color={balanceColor}
        />
        <TarjetaKPI
          titulo="Tareas Activas"
          valor={(resumen.tareas.pendientes || 0) + (resumen.tareas.en_progreso || 0)}
          subtitulo={`${resumen.tareas.completadas ?? 0} completadas`}
          color="text-blue-600"
        />
        <TarjetaKPI
          titulo="Alertas Activas"
          valor={resumen.alertas?.reduce((acc, a) => acc + (parseInt(a.activas as any) || 0), 0) ?? 0}
          subtitulo="Sin resolver"
          color="text-orange-600"
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolución financiera */}
        <div className="tarjeta lg:col-span-2">
          <div className="tarjeta-header">
            <h3 className="font-semibold text-abaco-800">Evolución Financiera</h3>
            <p className="text-xs text-slate-400 mt-0.5">Ingresos vs Egresos por mes</p>
          </div>
          <div className="p-4">
            {resumen.evolucionFinanciera?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={resumen.evolucionFinanciera}>
                  <defs>
                    <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradEgresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => formatearPeso(v)} />
                  <Area type="monotone" dataKey="ingresos" stroke="#1d4ed8" fill="url(#gradIngresos)" strokeWidth={2} name="Ingresos" />
                  <Area type="monotone" dataKey="egresos" stroke="#ef4444" fill="url(#gradEgresos)" strokeWidth={2} name="Egresos" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Sin datos financieros aún
              </div>
            )}
          </div>
        </div>

        {/* Estado de tareas */}
        <div className="tarjeta">
          <div className="tarjeta-header">
            <h3 className="font-semibold text-abaco-800">Estado de Tareas</h3>
          </div>
          <div className="p-4 flex items-center justify-center">
            {datosTareas.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={datosTareas}
                    dataKey="valor"
                    nameKey="nombre"
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {datosTareas.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Sin tareas registradas
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertas y tareas recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas recientes */}
        <div className="tarjeta">
          <div className="tarjeta-header flex items-center justify-between">
            <h3 className="font-semibold text-abaco-800">Alertas Activas</h3>
            <a href="/alertas" className="text-xs text-abaco-600 hover:underline">Ver todas →</a>
          </div>
          <div className="divide-y divide-slate-100">
            {(resumen.alertasRecientes || []).length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                ✅ Sin alertas activas
              </div>
            ) : (
              resumen.alertasRecientes.map((alerta: Alerta) => (
                <div key={alerta.id} className="px-6 py-3 flex items-start gap-3">
                  <span
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: COLORES_SEVERIDAD[alerta.severidad] || '#94a3b8' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{alerta.titulo}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {alerta.severidad} · {formatearFecha(alerta.created_at || '')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tareas próximas */}
        <div className="tarjeta">
          <div className="tarjeta-header flex items-center justify-between">
            <h3 className="font-semibold text-abaco-800">Tareas Próximas</h3>
            <a href="/tareas" className="text-xs text-abaco-600 hover:underline">Ver todas →</a>
          </div>
          <div className="divide-y divide-slate-100">
            {(resumen.tareasRecientes || []).length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                Sin tareas pendientes
              </div>
            ) : (
              resumen.tareasRecientes.map((tarea: Tarea) => (
                <div key={tarea.id} className="px-6 py-3 flex items-start gap-3">
                  <span className={`badge mt-0.5 ${
                    tarea.prioridad === 'critica' ? 'badge-rojo' :
                    tarea.prioridad === 'alta' ? 'badge-naranja' :
                    tarea.prioridad === 'media' ? 'badge-oro' : 'badge-gris'
                  }`}>{tarea.prioridad}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{tarea.titulo}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {tarea.asignado_nombre || 'Sin asignar'}
                      {tarea.fecha_limite && ` · Límite: ${formatearFecha(tarea.fecha_limite)}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Widget Comunidad ── */}
      <div className="border border-white/[0.06] bg-black">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-white/50">
              Comunidad
            </p>
            {sinLeer > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wide bg-oro-400 text-black">
                {sinLeer} nueva{sinLeer !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/comunidad')}
            className="text-[9px] tracking-[0.18em] uppercase text-white/25 hover:text-white/60 transition-colors"
          >
            Ver todo →
          </button>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {pubsRecientes.length === 0 ? (
            <div className="px-6 py-8 text-center text-white/15 text-[11px] tracking-wider">
              Sin publicaciones recientes
            </div>
          ) : (
            pubsRecientes.map((pub) => (
              <div
                key={pub.id}
                className="px-6 py-3 flex items-start gap-4 hover:bg-white/[0.02] cursor-pointer transition-colors"
                onClick={() => navigate('/comunidad')}
              >
                <div className="w-6 h-6 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-[9px] font-bold">
                    {pub.usuario_nombre?.charAt(0)}{pub.usuario_apellido?.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-white/70 font-medium truncate">
                    {pub.usuario_nombre} {pub.usuario_apellido}
                  </p>
                  <p className="text-[11px] text-white/35 mt-0.5 line-clamp-2 leading-relaxed">
                    {pub.contenido}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-white/20 text-[9px] font-mono">
                  <span>♡ {pub.likes}</span>
                  <span>◎ {pub.comentarios}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
