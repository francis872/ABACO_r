import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { formatearFecha } from '@/utils/formato'

const PRIORIDAD_COLOR: Record<string, string> = {
  critica: 'badge-rojo', alta: 'badge-naranja', media: 'badge-oro', baja: 'badge-gris',
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'badge-gris', en_progreso: 'badge-azul', completada: 'badge-verde', cancelada: 'badge-rojo',
}

const COLUMNAS = [
  { id: 'pendiente', label: 'Pendiente', icon: '📋' },
  { id: 'en_progreso', label: 'En Progreso', icon: '🔄' },
  { id: 'completada', label: 'Completada', icon: '✅' },
  { id: 'cancelada', label: 'Cancelada', icon: '🚫' },
]

export default function Tareas() {
  const [tareas, setTareas] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [vista, setVista] = useState<'kanban' | 'tabla'>('kanban')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', fecha_limite: '' })

  const cargar = async () => {
    try {
      const [t, u] = await Promise.all([api.get('/datos/tareas'), api.get('/usuarios')])
      setTareas(t.data.tareas || [])
      setUsuarios(u.data.usuarios || [])
    } catch {
      toast.error('Error al cargar tareas')
    }
  }

  useEffect(() => { cargar() }, [])

  const crear = async () => {
    if (!form.titulo.trim()) return toast.error('El título es requerido')
    try {
      await api.post('/datos/tareas', form)
      toast.success('Tarea creada')
      setMostrarModal(false)
      setForm({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', fecha_limite: '' })
      cargar()
    } catch { toast.error('Error al crear') }
  }

  const cambiarEstado = async (id: string, estado: string) => {
    try {
      await api.put(`/datos/tareas/${id}`, { estado })
      cargar()
    } catch { toast.error('Error al actualizar') }
  }

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          <button onClick={() => setVista('kanban')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${vista === 'kanban' ? 'bg-abaco-700 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
            🗂 Kanban
          </button>
          <button onClick={() => setVista('tabla')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${vista === 'tabla' ? 'bg-abaco-700 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
            📋 Tabla
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{tareas.length} tareas en total</span>
          <button onClick={() => setMostrarModal(true)} className="btn-primario">+ Nueva Tarea</button>
        </div>
      </div>

      {/* Vista Kanban */}
      {vista === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNAS.map((col) => {
            const tareasCol = tareas.filter((t) => t.estado === col.id)
            return (
              <div key={col.id} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-base">{col.icon}</span>
                  <h3 className="text-sm font-semibold text-abaco-800">{col.label}</h3>
                  <span className="ml-auto bg-slate-200 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
                    {tareasCol.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {tareasCol.map((t) => (
                    <div key={t.id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 hover:border-abaco-200 transition-colors">
                      <p className="text-sm font-medium text-abaco-800 leading-snug mb-2">{t.titulo}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge text-xs ${PRIORIDAD_COLOR[t.prioridad] || 'badge-gris'}`}>{t.prioridad}</span>
                        {t.asignado_nombre && (
                          <span className="text-xs text-slate-400 truncate max-w-[90px]">{t.asignado_nombre}</span>
                        )}
                      </div>
                      {t.fecha_limite && (
                        <p className="text-xs text-slate-400 mt-2">{formatearFecha(t.fecha_limite)}</p>
                      )}
                      {/* Botones de avance rápido */}
                      <div className="mt-2 flex gap-1">
                        {col.id !== 'pendiente' && (
                          <button
                            onClick={() => cambiarEstado(t.id, COLUMNAS[COLUMNAS.findIndex((c) => c.id === col.id) - 1]?.id)}
                            className="text-xs text-slate-400 hover:text-slate-600 px-1"
                          >
                            ← Atrás
                          </button>
                        )}
                        {col.id !== 'cancelada' && col.id !== 'completada' && (
                          <button
                            onClick={() => cambiarEstado(t.id, COLUMNAS[COLUMNAS.findIndex((c) => c.id === col.id) + 1]?.id)}
                            className="text-xs text-abaco-600 hover:text-abaco-800 px-1 ml-auto"
                          >
                            Avanzar →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {tareasCol.length === 0 && (
                    <div className="text-center py-4 text-slate-300 text-xs">Sin tareas</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Vista Tabla */}
      {vista === 'tabla' && (
        <div className="tarjeta">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {['Tarea', 'Prioridad', 'Asignada a', 'Estado', 'Límite'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tareas.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-abaco-800">{t.titulo}</td>
                    <td className="px-6 py-3"><span className={`badge ${PRIORIDAD_COLOR[t.prioridad] || 'badge-gris'}`}>{t.prioridad}</span></td>
                    <td className="px-6 py-3 text-slate-600">{t.asignado_nombre || '—'}</td>
                    <td className="px-6 py-3">
                      <select
                        value={t.estado}
                        onChange={(e) => cambiarEstado(t.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-abaco-600"
                      >
                        {COLUMNAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-xs">
                      {t.fecha_limite ? formatearFecha(t.fecha_limite) : '—'}
                    </td>
                  </tr>
                ))}
                {tareas.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400">Sin tareas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b flex justify-between">
              <h3 className="font-semibold text-abaco-800">Nueva Tarea</h3>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="etiqueta">Título *</label><input className="campo-entrada" value={form.titulo} onChange={(e) => setForm({...form, titulo: e.target.value})} /></div>
              <div><label className="etiqueta">Descripción</label><textarea className="campo-entrada resize-none" rows={2} value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Prioridad</label>
                  <select className="campo-entrada" value={form.prioridad} onChange={(e) => setForm({...form, prioridad: e.target.value})}>
                    <option value="baja">Baja</option><option value="media">Media</option>
                    <option value="alta">Alta</option><option value="critica">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="etiqueta">Asignar a</label>
                  <select className="campo-entrada" value={form.asignado_a} onChange={(e) => setForm({...form, asignado_a: e.target.value})}>
                    <option value="">Sin asignar</option>
                    {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="etiqueta">Fecha límite</label><input type="date" className="campo-entrada" value={form.fecha_limite} onChange={(e) => setForm({...form, fecha_limite: e.target.value})} /></div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setMostrarModal(false)} className="btn-secundario">Cancelar</button>
              <button onClick={crear} className="btn-primario">Crear Tarea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
