import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { formatearFecha } from '@/utils/formato'
import type { Alerta } from '@/types'

const SEVERIDAD_BADGE: Record<string, string> = {
  baja: 'badge-gris',
  media: 'badge-oro',
  alta: 'badge-naranja',
  critica: 'badge-rojo',
}

const SEVERIDAD_ICON: Record<string, string> = {
  baja: 'ℹ️',
  media: '⚠️',
  alta: '🔶',
  critica: '🚨',
}

export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [cargando, setCargando] = useState(false)
  const [filtroSeveridad, setFiltroSeveridad] = useState('')
  const [soloActivas, setSoloActivas] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', severidad: 'media', tipo: '' })

  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/analisis/alertas', {
        params: {
          severidad: filtroSeveridad || undefined,
          resuelta: soloActivas ? false : undefined,
        },
      })
      setAlertas(data.alertas || [])
    } catch {
      toast.error('Error al cargar alertas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [filtroSeveridad, soloActivas])

  const resolver = async (id: string) => {
    try {
      await api.put(`/analisis/alertas/${id}/resolver`)
      toast.success('Alerta resuelta')
      cargar()
    } catch {
      toast.error('Error al resolver')
    }
  }

  const crear = async () => {
    if (!form.titulo.trim()) return toast.error('El título es requerido')
    try {
      await api.post('/analisis/alertas', form)
      toast.success('Alerta creada')
      setMostrarModal(false)
      setForm({ titulo: '', descripcion: '', severidad: 'media', tipo: '' })
      cargar()
    } catch {
      toast.error('Error al crear alerta')
    }
  }

  const totalPorSeveridad = ['baja', 'media', 'alta', 'critica'].map((s) => ({
    s,
    count: alertas.filter((a) => a.severidad === s).length,
  }))

  return (
    <div className="space-y-5">
      {/* Resumen de severidades */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {totalPorSeveridad.map(({ s, count }) => (
          <button
            key={s}
            onClick={() => setFiltroSeveridad(filtroSeveridad === s ? '' : s)}
            className={`tarjeta p-4 text-left transition-all hover:shadow-md
              ${filtroSeveridad === s ? 'ring-2 ring-abaco-600' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">{SEVERIDAD_ICON[s]}</span>
              <span className={`badge ${SEVERIDAD_BADGE[s]}`}>{s}</span>
            </div>
            <p className="text-3xl font-bold text-abaco-800 mt-2">{count}</p>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">Alertas {s}s</p>
          </button>
        ))}
      </div>

      {/* Controles */}
      <div className="tarjeta p-4 flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soloActivas}
            onChange={(e) => setSoloActivas(e.target.checked)}
            className="w-4 h-4 accent-abaco-700"
          />
          <span className="text-sm text-slate-600">Mostrar solo activas</span>
        </label>
        {filtroSeveridad && (
          <button onClick={() => setFiltroSeveridad('')} className="text-xs text-abaco-600 hover:underline">
            ✕ Quitar filtro de severidad
          </button>
        )}
        <div className="ml-auto">
          <button onClick={() => setMostrarModal(true)} className="btn-primario">+ Nueva Alerta</button>
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="tarjeta">
        <div className="tarjeta-header">
          <h2 className="font-semibold text-abaco-800">Alertas del Sistema</h2>
          <p className="text-xs text-slate-400 mt-0.5">{alertas.length} alertas</p>
        </div>

        {cargando ? (
          <div className="py-12 text-center text-slate-400 text-sm">Cargando...</div>
        ) : alertas.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="font-medium text-slate-500">Sin alertas activas</p>
            <p className="text-sm text-slate-400 mt-1">El sistema opera con normalidad</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alertas.map((a) => (
              <div
                key={a.id}
                className={`flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors
                  ${a.resuelta ? 'opacity-60' : ''}`}
              >
                <span className="text-2xl mt-0.5 shrink-0">{SEVERIDAD_ICON[a.severidad]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-semibold text-abaco-800">{a.titulo}</h4>
                    <span className={`badge ${SEVERIDAD_BADGE[a.severidad]}`}>{a.severidad}</span>
                    {a.tipo && <span className="badge badge-gris">{a.tipo}</span>}
                    {a.resuelta && <span className="badge badge-verde">Resuelta</span>}
                  </div>
                  {a.descripcion && <p className="text-sm text-slate-500 mt-1">{a.descripcion}</p>}
                  <p className="text-xs text-slate-400 mt-1.5">{formatearFecha(a.created_at ?? '')}</p>
                  {a.resuelta_en && (
                    <p className="text-xs text-emerald-500 mt-0.5">
                      Resuelta el {formatearFecha(a.resuelta_en)}
                    </p>
                  )}
                </div>
                {!a.resuelta && (
                  <button
                    onClick={() => resolver(a.id)}
                    className="btn-secundario py-1.5 text-xs shrink-0"
                  >
                    ✓ Resolver
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b flex justify-between">
              <h3 className="font-semibold text-abaco-800">Nueva Alerta</h3>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="etiqueta">Título *</label>
                <input className="campo-entrada" value={form.titulo} onChange={(e) => setForm({...form, titulo: e.target.value})} />
              </div>
              <div>
                <label className="etiqueta">Descripción</label>
                <textarea className="campo-entrada resize-none" rows={3} value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Severidad</label>
                  <select className="campo-entrada" value={form.severidad} onChange={(e) => setForm({...form, severidad: e.target.value})}>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="etiqueta">Tipo</label>
                  <input className="campo-entrada" value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value})} placeholder="Ej: territorial, financiero..." />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setMostrarModal(false)} className="btn-secundario">Cancelar</button>
              <button onClick={crear} className="btn-primario">Crear Alerta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
