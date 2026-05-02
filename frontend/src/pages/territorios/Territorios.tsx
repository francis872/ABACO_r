import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import type { Territorio } from '@/types'

const NIVELES = ['pais', 'departamento', 'municipio', 'localidad', 'barrio', 'zona', 'sector', 'mesa']

const FORM_VACIO = {
  nombre: '', codigo: '', nivel: 'municipio', padre_id: '',
  poblacion: '', votantes_censo: '', prioridad: '3',
  latitud: '', longitud: '', notas: '',
}

export default function Territorios() {
  const [territorios, setTerritorios] = useState<Territorio[]>([])
  const [cargando, setCargando] = useState(false)
  const [filtroNivel, setFiltroNivel] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<Territorio | null>(null)
  const [form, setForm] = useState({ ...FORM_VACIO })

  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/territorio', { params: { nivel: filtroNivel || undefined } })
      setTerritorios(data.territorios || [])
    } catch {
      toast.error('Error al cargar territorios')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [filtroNivel])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ ...FORM_VACIO })
    setMostrarModal(true)
  }

  const abrirEditar = (t: Territorio) => {
    setEditando(t)
    setForm({
      nombre: t.nombre,
      codigo: t.codigo || '',
      nivel: t.nivel,
      padre_id: t.padre_id || '',
      poblacion: t.poblacion?.toString() || '',
      votantes_censo: t.votantes_censo?.toString() || '',
      prioridad: t.prioridad?.toString() || '3',
      latitud: t.latitud?.toString() || '',
      longitud: t.longitud?.toString() || '',
      notas: t.notas || '',
    })
    setMostrarModal(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es requerido')
    const payload = {
      nombre: form.nombre,
      codigo: form.codigo || undefined,
      nivel: form.nivel,
      padre_id: form.padre_id || undefined,
      poblacion: form.poblacion ? parseInt(form.poblacion) : undefined,
      votantes_censo: form.votantes_censo ? parseInt(form.votantes_censo) : undefined,
      prioridad: parseInt(form.prioridad),
      latitud: form.latitud ? parseFloat(form.latitud) : undefined,
      longitud: form.longitud ? parseFloat(form.longitud) : undefined,
      notas: form.notas || undefined,
    }
    try {
      if (editando) {
        await api.put(`/territorio/${editando.id}`, payload)
        toast.success('Territorio actualizado')
      } else {
        await api.post('/territorio', payload)
        toast.success('Territorio registrado')
      }
      setMostrarModal(false)
      cargar()
    } catch (err: any) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este territorio? Esta acción no se puede deshacer.')) return
    try {
      await api.delete(`/territorio/${id}`)
      toast.success('Territorio eliminado')
      cargar()
    } catch {
      toast.error('Error al eliminar. El territorio puede tener dependencias.')
    }
  }

  const NIVEL_BADGE: Record<string, string> = {
    pais: 'badge-azul', departamento: 'badge-verde', municipio: 'badge-oro',
    localidad: 'badge-naranja', barrio: 'badge-gris', zona: 'badge-gris',
    sector: 'badge-gris', mesa: 'badge-gris',
  }

  return (
    <div className="space-y-5">
      {/* Filtros + acciones */}
      <div className="tarjeta p-4 flex items-center gap-4 flex-wrap">
        <div>
          <label className="etiqueta">Filtrar por nivel</label>
          <select className="campo-entrada w-44" value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>
            <option value="">Todos</option>
            {NIVELES.map((n) => <option key={n} value={n} className="capitalize">{n}</option>)}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={cargar} className="btn-secundario">↻ Actualizar</button>
          <button onClick={abrirNuevo} className="btn-primario">+ Nuevo Territorio</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="tarjeta">
        <div className="tarjeta-header">
          <h2 className="font-semibold text-abaco-800">Territorios</h2>
          <p className="text-xs text-slate-400 mt-0.5">{territorios.length} registros</p>
        </div>
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Nombre', 'Código', 'Nivel', 'Población', 'Votantes', 'Prioridad', 'Coords.', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {territorios.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-abaco-800">{t.nombre}</td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{t.codigo || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`badge ${NIVEL_BADGE[t.nivel] || 'badge-gris'} capitalize`}>{t.nivel}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {t.poblacion ? t.poblacion.toLocaleString('es-CO') : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {t.votantes_censo ? t.votantes_censo.toLocaleString('es-CO') : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-xs ${i < (t.prioridad || 3) ? 'text-oro-500' : 'text-slate-200'}`}>★</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-400">
                      {t.latitud ? `${t.latitud.toFixed(2)}, ${t.longitud?.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => abrirEditar(t)} className="btn-secundario py-1 text-xs">Editar</button>
                        <button onClick={() => eliminar(t.id)} className="btn-peligro py-1 text-xs">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {territorios.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <p className="text-2xl mb-2">🗺</p>
                      <p className="text-slate-500 font-medium">Sin territorios registrados</p>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b flex justify-between">
              <h3 className="font-semibold text-abaco-800">{editando ? 'Editar Territorio' : 'Nuevo Territorio'}</h3>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Nombre *</label>
                  <input className="campo-entrada" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="etiqueta">Código</label>
                  <input className="campo-entrada" value={form.codigo} onChange={(e) => setForm({...form, codigo: e.target.value})} placeholder="Ej: COL-DC-001" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Nivel Territorial</label>
                  <select className="campo-entrada" value={form.nivel} onChange={(e) => setForm({...form, nivel: e.target.value})}>
                    {NIVELES.map((n) => <option key={n} value={n} className="capitalize">{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="etiqueta">Territorio Padre</label>
                  <select className="campo-entrada" value={form.padre_id} onChange={(e) => setForm({...form, padre_id: e.target.value})}>
                    <option value="">Ninguno (nivel raíz)</option>
                    {territorios.filter((t) => t.id !== editando?.id).map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre} ({t.nivel})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Población</label>
                  <input type="number" className="campo-entrada" value={form.poblacion} onChange={(e) => setForm({...form, poblacion: e.target.value})} />
                </div>
                <div>
                  <label className="etiqueta">Votantes en Censo</label>
                  <input type="number" className="campo-entrada" value={form.votantes_censo} onChange={(e) => setForm({...form, votantes_censo: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="etiqueta">Prioridad (1–5)</label>
                <input type="range" min="1" max="5" step="1" value={form.prioridad}
                  onChange={(e) => setForm({...form, prioridad: e.target.value})}
                  className="w-full accent-abaco-700"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={parseInt(form.prioridad) === i + 1 ? 'font-bold text-abaco-700' : ''}>{'★'.repeat(i + 1)}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Latitud</label>
                  <input type="number" step="any" className="campo-entrada" value={form.latitud} onChange={(e) => setForm({...form, latitud: e.target.value})} placeholder="Ej: 4.7110" />
                </div>
                <div>
                  <label className="etiqueta">Longitud</label>
                  <input type="number" step="any" className="campo-entrada" value={form.longitud} onChange={(e) => setForm({...form, longitud: e.target.value})} placeholder="Ej: -74.0721" />
                </div>
              </div>
              <div>
                <label className="etiqueta">Notas</label>
                <textarea className="campo-entrada resize-none" rows={2} value={form.notas} onChange={(e) => setForm({...form, notas: e.target.value})} />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setMostrarModal(false)} className="btn-secundario">Cancelar</button>
              <button onClick={guardar} className="btn-primario">{editando ? 'Actualizar' : 'Registrar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
