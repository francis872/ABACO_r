import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { formatearPeso, formatearFecha } from '@/utils/formato'
import type { Transaccion } from '@/types'

const COLORES = ['#1d4ed8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16']

const FORM_VACIO = {
  tipo: 'ingreso', monto: '', descripcion: '', categoria_id: '', fecha: new Date().toISOString().slice(0, 10),
  referencia: '',
}

export default function Financiero() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [categorias, setCategorias] = useState<any[]>([])
  const [evolucion, setEvolucion] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [form, setForm] = useState({ ...FORM_VACIO })

  const cargar = async () => {
    setCargando(true)
    try {
      const [tx, fin] = await Promise.all([
        api.get('/analisis/transacciones'),
        api.get('/analisis/financiero'),
      ])
      setTransacciones(tx.data.transacciones || [])
      const f = fin.data.financiero || {}
      setResumen(f.resumen)
      setCategorias(f.porCategoria || [])
      setEvolucion(f.evolucionMensual || [])
    } catch {
      toast.error('Error al cargar datos financieros')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const guardar = async () => {
    if (!form.monto || parseFloat(form.monto) <= 0) return toast.error('El monto debe ser mayor a 0')
    if (!form.descripcion.trim()) return toast.error('La descripción es requerida')
    try {
      await api.post('/analisis/transacciones', {
        tipo: form.tipo,
        monto: parseFloat(form.monto),
        descripcion: form.descripcion,
        categoria_id: form.categoria_id || undefined,
        fecha: form.fecha,
        referencia: form.referencia || undefined,
      })
      toast.success('Transacción registrada')
      setMostrarModal(false)
      setForm({ ...FORM_VACIO })
      cargar()
    } catch (err: any) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const balance = (resumen?.total_ingresos || 0) - (resumen?.total_egresos || 0)

  const TIPO_STYLE: Record<string, string> = {
    ingreso: 'badge-verde',
    egreso: 'badge-rojo',
    donacion: 'badge-azul',
    transferencia: 'badge-gris',
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="tarjeta p-5">
          <p className="etiqueta">Total Ingresos</p>
          <p className="text-2xl font-bold text-emerald-600">{formatearPeso(resumen?.total_ingresos)}</p>
          <p className="text-xs text-slate-400 mt-1">{resumen?.num_ingresos || 0} transacciones</p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Total Egresos</p>
          <p className="text-2xl font-bold text-red-600">{formatearPeso(resumen?.total_egresos)}</p>
          <p className="text-xs text-slate-400 mt-1">{resumen?.num_egresos || 0} transacciones</p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Donaciones</p>
          <p className="text-2xl font-bold text-blue-600">{formatearPeso(resumen?.total_donaciones)}</p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Balance Neto</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatearPeso(balance)}
          </p>
          <p className={`text-xs mt-1 ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {balance >= 0 ? '▲ Superávit' : '▼ Déficit'}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="tarjeta">
          <div className="tarjeta-header">
            <h3 className="font-semibold text-abaco-800">Gastos por Categoría</h3>
          </div>
          <div className="p-4">
            {categorias.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categorias} dataKey="total" nameKey="categoria" cx="50%" cy="50%" outerRadius={85} innerRadius={40} paddingAngle={3}>
                    {categorias.map((_: any, i: number) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>} />
                  <Tooltip formatter={(v: number) => formatearPeso(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sin egresos categorizados</div>
            )}
          </div>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-header">
            <h3 className="font-semibold text-abaco-800">Flujo Mensual</h3>
          </div>
          <div className="p-4">
            {evolucion.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={evolucion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} />
                  <Tooltip formatter={(v: number) => formatearPeso(v)} />
                  <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="egresos" fill="#ef4444" name="Egresos" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Sin historial mensual</div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de transacciones */}
      <div className="tarjeta">
        <div className="tarjeta-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-abaco-800">Transacciones</h2>
            <p className="text-xs text-slate-400 mt-0.5">{transacciones.length} registros</p>
          </div>
          <button onClick={() => setMostrarModal(true)} className="btn-primario">+ Registrar Transacción</button>
        </div>
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Monto', 'Referencia'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transacciones.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-500 text-xs">{formatearFecha(t.fecha)}</td>
                    <td className="px-6 py-3">
                      <span className={`badge ${TIPO_STYLE[t.tipo] || 'badge-gris'} capitalize`}>{t.tipo}</span>
                    </td>
                    <td className="px-6 py-3 font-medium text-abaco-800">{t.descripcion}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{t.categoria_nombre || '—'}</td>
                    <td className={`px-6 py-3 font-semibold ${t.tipo === 'ingreso' || t.tipo === 'donacion' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.tipo === 'ingreso' || t.tipo === 'donacion' ? '+' : '-'}{formatearPeso(t.monto)}
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-xs font-mono">{t.referencia || '—'}</td>
                  </tr>
                ))}
                {transacciones.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <p className="text-2xl mb-2">💰</p>
                      <p className="text-slate-500">Sin transacciones registradas</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b flex justify-between">
              <h3 className="font-semibold text-abaco-800">Nueva Transacción</h3>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Tipo *</label>
                  <select className="campo-entrada" value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value})}>
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                    <option value="donacion">Donación</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="etiqueta">Monto (COP) *</label>
                  <input type="number" min="0" step="1000" className="campo-entrada" value={form.monto} onChange={(e) => setForm({...form, monto: e.target.value})} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="etiqueta">Descripción *</label>
                <input className="campo-entrada" value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Categoría</label>
                  <select className="campo-entrada" value={form.categoria_id} onChange={(e) => setForm({...form, categoria_id: e.target.value})}>
                    <option value="">Sin categoría</option>
                    {/* se cargarían desde /categorias */}
                  </select>
                </div>
                <div>
                  <label className="etiqueta">Fecha</label>
                  <input type="date" className="campo-entrada" value={form.fecha} onChange={(e) => setForm({...form, fecha: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="etiqueta">Referencia / Comprobante</label>
                <input className="campo-entrada" value={form.referencia} onChange={(e) => setForm({...form, referencia: e.target.value})} placeholder="Número de comprobante (opcional)" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setMostrarModal(false)} className="btn-secundario">Cancelar</button>
              <button onClick={guardar} className="btn-primario">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
