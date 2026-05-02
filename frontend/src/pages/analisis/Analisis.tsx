import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, PieChart, Pie, Cell, Legend,
} from 'recharts'
import api from '@/services/api'
import { formatearPeso } from '@/utils/formato'
import toast from 'react-hot-toast'

const COLORES = ['#1d4ed8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316']

export default function Analisis() {
  const [pestana, setPestana] = useState<'territorial' | 'financiero' | 'simulacion'>('territorial')
  const [datosTerritorial, setDatosTerritorial] = useState<any[]>([])
  const [datosFinanciero, setDatosFinanciero] = useState<any>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [pestana])

  const cargarDatos = async () => {
    setCargando(true)
    try {
      if (pestana === 'territorial') {
        const { data } = await api.get('/analisis/territorial')
        setDatosTerritorial(data.analisis || [])
      } else if (pestana === 'financiero') {
        const { data } = await api.get('/analisis/financiero')
        setDatosFinanciero(data.financiero)
      }
    } catch {
      toast.error('Error al cargar datos de análisis')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Pestañas */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { id: 'territorial', label: '🗺 Análisis Territorial' },
          { id: 'financiero',  label: '💰 Análisis Financiero' },
          { id: 'simulacion',  label: '🔮 Simulación' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPestana(p.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${pestana === p.id ? 'bg-abaco-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {cargando && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-abaco-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!cargando && pestana === 'territorial' && (
        <AnalisisTerritorial datos={datosTerritorial} />
      )}

      {!cargando && pestana === 'financiero' && datosFinanciero && (
        <AnalisisFinanciero datos={datosFinanciero} />
      )}

      {pestana === 'simulacion' && (
        <SimulacionEscenario />
      )}
    </div>
  )
}

// ─── Análisis Territorial ────────────────────────────────────────
function AnalisisTerritorial({ datos }: { datos: any[] }) {
  const top10 = datos.slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="tarjeta p-5">
          <p className="etiqueta">Territorios Analizados</p>
          <p className="text-3xl font-bold text-abaco-800">{datos.length}</p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Total Votos Históricos</p>
          <p className="text-3xl font-bold text-blue-600">
            {datos.reduce((a, d) => a + (parseInt(d.total_votos) || 0), 0).toLocaleString('es-CO')}
          </p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Contactos Registrados</p>
          <p className="text-3xl font-bold text-emerald-600">
            {datos.reduce((a, d) => a + (parseInt(d.contactos_registrados) || 0), 0).toLocaleString('es-CO')}
          </p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Voluntarios</p>
          <p className="text-3xl font-bold text-oro-500">
            {datos.reduce((a, d) => a + (parseInt(d.voluntarios) || 0), 0).toLocaleString('es-CO')}
          </p>
        </div>
      </div>

      {/* Gráfico de barras - Votos por territorio */}
      <div className="tarjeta">
        <div className="tarjeta-header">
          <h3 className="font-semibold text-abaco-800">Votos Históricos por Territorio (Top 10)</h3>
        </div>
        <div className="p-4">
          {top10.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="territorio" width={140} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip formatter={(v: number) => v.toLocaleString('es-CO')} />
                <Bar dataKey="total_votos" fill="#1d4ed8" radius={[0, 4, 4, 0]} name="Votos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Sin datos electorales. Importa resultados históricos para activar el análisis.
            </div>
          )}
        </div>
      </div>

      {/* Tabla detallada */}
      <div className="tarjeta">
        <div className="tarjeta-header">
          <h3 className="font-semibold text-abaco-800">Detalle por Territorio</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                {['Territorio', 'Nivel', 'Votantes Censo', 'Votos Históricos', '% Participación', 'Contactos', 'Prioridad'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datos.map((d) => {
                const participacion = d.votantes_censo && d.total_votos
                  ? ((d.total_votos / d.votantes_censo) * 100).toFixed(1)
                  : '—'
                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-abaco-800">{d.territorio}</td>
                    <td className="px-6 py-3"><span className="badge badge-gris capitalize">{d.nivel}</span></td>
                    <td className="px-6 py-3 text-slate-600">{d.votantes_censo?.toLocaleString('es-CO') || '—'}</td>
                    <td className="px-6 py-3 text-slate-600">{parseInt(d.total_votos || 0).toLocaleString('es-CO')}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-abaco-600 rounded-full"
                            style={{ width: `${Math.min(parseFloat(participacion as string) || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{participacion}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{parseInt(d.contactos_registrados || 0)}</td>
                    <td className="px-6 py-3">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-xs ${i < (d.prioridad || 3) ? 'text-oro-500' : 'text-slate-200'}`}>★</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {datos.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Sin datos territoriales</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Análisis Financiero ─────────────────────────────────────────
function AnalisisFinanciero({ datos }: { datos: any }) {
  const { porCategoria, evolucionMensual, resumen } = datos
  const balance = (resumen?.total_ingresos || 0) - (resumen?.total_egresos || 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="tarjeta p-5">
          <p className="etiqueta">Total Ingresos</p>
          <p className="text-2xl font-bold text-emerald-600">{formatearPeso(resumen?.total_ingresos)}</p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Total Egresos</p>
          <p className="text-2xl font-bold text-red-600">{formatearPeso(resumen?.total_egresos)}</p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Donaciones</p>
          <p className="text-2xl font-bold text-blue-600">{formatearPeso(resumen?.total_donaciones)}</p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Balance</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatearPeso(balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por categoría */}
        <div className="tarjeta">
          <div className="tarjeta-header">
            <h3 className="font-semibold text-abaco-800">Distribución de Gastos</h3>
          </div>
          <div className="p-4">
            {porCategoria?.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={porCategoria} dataKey="total" nameKey="categoria" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                    {porCategoria.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color || COLORES[i % COLORES.length]} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                  <Tooltip formatter={(v: number) => formatearPeso(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sin transacciones registradas</div>
            )}
          </div>
        </div>

        {/* Evolución mensual */}
        <div className="tarjeta">
          <div className="tarjeta-header">
            <h3 className="font-semibold text-abaco-800">Evolución Mensual</h3>
          </div>
          <div className="p-4">
            {evolucionMensual?.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={evolucionMensual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => formatearPeso(v)} />
                  <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" radius={[4,4,0,0]} />
                  <Bar dataKey="egresos" fill="#ef4444" name="Egresos" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Sin datos mensuales</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Simulación de Escenario ─────────────────────────────────────
function SimulacionEscenario() {
  const [territorios, setTerritorios] = useState<any[]>([])
  const [form, setForm] = useState({ territorio_id: '', incremento_participacion: 0, crecimiento_apoyo: 0 })
  const [resultado, setResultado] = useState<any>(null)
  const [simulando, setSimulando] = useState(false)

  useEffect(() => {
    api.get('/territorio').then(({ data }) => setTerritorios(data.territorios || []))
  }, [])

  const simular = async () => {
    if (!form.territorio_id) return toast.error('Selecciona un territorio')
    setSimulando(true)
    try {
      const { data } = await api.post('/analisis/simulacion', {
        territorio_id: form.territorio_id,
        incremento_participacion: parseFloat(form.incremento_participacion as any) || 0,
        crecimiento_apoyo: parseFloat(form.crecimiento_apoyo as any) || 0,
      })
      setResultado(data.simulacion)
    } catch {
      toast.error('Error al ejecutar la simulación')
    } finally {
      setSimulando(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="tarjeta">
        <div className="tarjeta-header">
          <h3 className="font-semibold text-abaco-800">Parámetros de Simulación</h3>
          <p className="text-xs text-slate-400 mt-0.5">Proyecta escenarios electorales basados en datos históricos</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="etiqueta">Territorio</label>
            <select className="campo-entrada" value={form.territorio_id} onChange={(e) => setForm({...form, territorio_id: e.target.value})}>
              <option value="">Seleccionar territorio...</option>
              {territorios.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="etiqueta">Incremento de Participación (%)</label>
            <input type="range" min="-20" max="20" step="1"
              value={form.incremento_participacion}
              onChange={(e) => setForm({...form, incremento_participacion: parseInt(e.target.value)})}
              className="w-full accent-abaco-700"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>-20%</span>
              <span className="font-semibold text-abaco-700">
                {form.incremento_participacion > 0 ? '+' : ''}{form.incremento_participacion}%
              </span>
              <span>+20%</span>
            </div>
          </div>
          <div>
            <label className="etiqueta">Crecimiento en Apoyo (%)</label>
            <input type="range" min="-15" max="15" step="0.5"
              value={form.crecimiento_apoyo}
              onChange={(e) => setForm({...form, crecimiento_apoyo: parseFloat(e.target.value)})}
              className="w-full accent-abaco-700"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>-15%</span>
              <span className="font-semibold text-abaco-700">
                {form.crecimiento_apoyo > 0 ? '+' : ''}{form.crecimiento_apoyo}%
              </span>
              <span>+15%</span>
            </div>
          </div>
          <button onClick={simular} disabled={simulando} className="btn-primario w-full justify-center">
            {simulando ? 'Calculando...' : '🔮 Ejecutar Simulación'}
          </button>
        </div>
      </div>

      {resultado ? (
        <div className="tarjeta">
          <div className="tarjeta-header">
            <h3 className="font-semibold text-abaco-800">Resultados de Simulación</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Escenario Base</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Participación:</span><span className="font-semibold">{resultado.escenario_base.participacion}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Apoyo:</span><span className="font-semibold">{resultado.escenario_base.apoyo}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Votos est.:</span><span className="font-semibold">{parseInt(resultado.escenario_base.votos_estimados || 0).toLocaleString('es-CO')}</span></div>
                </div>
              </div>
              <div className="bg-abaco-50 border border-abaco-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-abaco-600 uppercase mb-3">Escenario Proyectado</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Participación:</span><span className="font-semibold text-abaco-700">{resultado.escenario_proyectado.participacion}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Apoyo:</span><span className="font-semibold text-abaco-700">{resultado.escenario_proyectado.apoyo}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Votos proy.:</span><span className="font-semibold text-abaco-700">{resultado.escenario_proyectado.votos_proyectados.toLocaleString('es-CO')}</span></div>
                </div>
              </div>
            </div>
            <div className={`rounded-xl p-4 ${resultado.escenario_proyectado.incremento_votos >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="text-sm font-semibold text-center">
                {resultado.escenario_proyectado.incremento_votos >= 0 ? '📈' : '📉'}{' '}
                {resultado.escenario_proyectado.incremento_votos >= 0 ? 'Ganancia' : 'Pérdida'} estimada:{' '}
                <span className={resultado.escenario_proyectado.incremento_votos >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                  {resultado.escenario_proyectado.incremento_votos >= 0 ? '+' : ''}{resultado.escenario_proyectado.incremento_votos.toLocaleString('es-CO')} votos
                </span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="tarjeta flex items-center justify-center">
          <div className="text-center text-slate-400 p-12">
            <p className="text-4xl mb-4">🔮</p>
            <p className="font-medium">Configura los parámetros y ejecuta la simulación</p>
            <p className="text-sm mt-2">Los resultados proyectarán escenarios basados en datos históricos</p>
          </div>
        </div>
      )}
    </div>
  )
}
