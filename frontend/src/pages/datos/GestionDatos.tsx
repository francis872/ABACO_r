import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import type { Contacto, Territorio } from '@/types'
import { formatearFecha } from '@/utils/formato'

export default function GestionDatos() {
  const [pestana, setPestana] = useState<'contactos' | 'campanas' | 'tareas'>('contactos')
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [territorios, setTerritorios] = useState<Territorio[]>([])
  const [cargando, setCargando] = useState(false)
  const [buscar, setBuscar] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<Contacto | null>(null)

  const [form, setForm] = useState({
    nombres: '', apellidos: '', documento: '', telefono: '', email: '',
    territorio_id: '', tipo: 'ciudadano', lider_comunitario: false,
    simpatizante: false, voluntario: false, notas: '',
  })

  const cargarContactos = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/datos/contactos', { params: { buscar: buscar || undefined } })
      setContactos(data.contactos || [])
    } catch {
      toast.error('Error al cargar contactos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    api.get('/territorio').then(({ data }) => setTerritorios(data.territorios || []))
    cargarContactos()
  }, [])

  const handleBuscar = () => cargarContactos()

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ nombres: '', apellidos: '', documento: '', telefono: '', email: '', territorio_id: '', tipo: 'ciudadano', lider_comunitario: false, simpatizante: false, voluntario: false, notas: '' })
    setMostrarModal(true)
  }

  const abrirEditar = (c: Contacto) => {
    setEditando(c)
    setForm({
      nombres: c.nombres, apellidos: c.apellidos || '', documento: c.documento || '',
      telefono: c.telefono || '', email: c.email || '', territorio_id: c.territorio_id || '',
      tipo: c.tipo, lider_comunitario: c.lider_comunitario, simpatizante: c.simpatizante,
      voluntario: c.voluntario, notas: c.notas || '',
    })
    setMostrarModal(true)
  }

  const guardar = async () => {
    if (!form.nombres.trim()) return toast.error('El nombre es requerido')
    try {
      if (editando) {
        await api.put(`/datos/contactos/${editando.id}`, form)
        toast.success('Contacto actualizado')
      } else {
        await api.post('/datos/contactos', form)
        toast.success('Contacto registrado')
      }
      setMostrarModal(false)
      cargarContactos()
    } catch (err: any) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este contacto?')) return
    try {
      await api.delete(`/datos/contactos/${id}`)
      toast.success('Contacto eliminado')
      cargarContactos()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-5">
      {/* Pestañas */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {(['contactos', 'campanas', 'tareas'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPestana(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
              ${pestana === p ? 'bg-abaco-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {p === 'contactos' ? '👥 Contactos' : p === 'campanas' ? '🚀 Campañas' : '✓ Tareas'}
          </button>
        ))}
      </div>

      {pestana === 'contactos' && (
        <div className="tarjeta">
          <div className="tarjeta-header flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-abaco-800">Contactos Territoriales</h2>
              <p className="text-xs text-slate-400 mt-0.5">{contactos.length} registros</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar contacto..."
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                className="campo-entrada w-56"
              />
              <button onClick={handleBuscar} className="btn-secundario">Buscar</button>
              <button onClick={abrirNuevo} className="btn-primario">+ Nuevo</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {cargando ? (
              <div className="py-16 text-center text-slate-400 text-sm">Cargando...</div>
            ) : contactos.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-slate-500 font-medium">Sin contactos registrados</p>
                <p className="text-slate-400 text-sm mt-1">Agrega el primer contacto territorial</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contacto</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Territorio</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Etiquetas</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contactos.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-abaco-800">
                        {c.nombres} {c.apellidos}
                        {c.documento && <span className="block text-xs text-slate-400">{c.documento}</span>}
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {c.telefono && <div>{c.telefono}</div>}
                        {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
                      </td>
                      <td className="px-6 py-3 text-slate-600">{c.territorio_nombre || '—'}</td>
                      <td className="px-6 py-3">
                        <span className="badge badge-gris capitalize">{c.tipo}</span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.lider_comunitario && <span className="badge badge-oro">Líder</span>}
                          {c.voluntario && <span className="badge badge-azul">Voluntario</span>}
                          {c.simpatizante && <span className="badge badge-verde">Simpatizante</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => abrirEditar(c)} className="btn-secundario py-1 text-xs">Editar</button>
                          <button onClick={() => eliminar(c.id)} className="btn-peligro py-1 text-xs">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {pestana === 'campanas' && <CampanasView />}
      {pestana === 'tareas' && <TareasView />}

      {/* Modal crear/editar contacto */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-abaco-800">
                {editando ? 'Editar Contacto' : 'Nuevo Contacto'}
              </h3>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Nombres *</label>
                  <input className="campo-entrada" value={form.nombres} onChange={(e) => setForm({...form, nombres: e.target.value})} placeholder="Nombres" />
                </div>
                <div>
                  <label className="etiqueta">Apellidos</label>
                  <input className="campo-entrada" value={form.apellidos} onChange={(e) => setForm({...form, apellidos: e.target.value})} placeholder="Apellidos" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Documento</label>
                  <input className="campo-entrada" value={form.documento} onChange={(e) => setForm({...form, documento: e.target.value})} placeholder="Número de documento" />
                </div>
                <div>
                  <label className="etiqueta">Teléfono</label>
                  <input className="campo-entrada" value={form.telefono} onChange={(e) => setForm({...form, telefono: e.target.value})} placeholder="Teléfono o celular" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Email</label>
                  <input type="email" className="campo-entrada" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Correo electrónico" />
                </div>
                <div>
                  <label className="etiqueta">Territorio</label>
                  <select className="campo-entrada" value={form.territorio_id} onChange={(e) => setForm({...form, territorio_id: e.target.value})}>
                    <option value="">Sin asignar</option>
                    {territorios.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="etiqueta">Tipo de contacto</label>
                <select className="campo-entrada" value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value})}>
                  <option value="ciudadano">Ciudadano</option>
                  <option value="lider">Líder comunitario</option>
                  <option value="funcionario">Funcionario</option>
                  <option value="medios">Medios de comunicación</option>
                  <option value="aliado">Aliado estratégico</option>
                </select>
              </div>
              <div className="flex gap-6">
                {[
                  { campo: 'lider_comunitario', label: 'Líder Comunitario' },
                  { campo: 'voluntario', label: 'Voluntario' },
                  { campo: 'simpatizante', label: 'Simpatizante' },
                ].map(({ campo, label }) => (
                  <label key={campo} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[campo as keyof typeof form] as boolean}
                      onChange={(e) => setForm({...form, [campo]: e.target.checked})}
                      className="w-4 h-4 accent-abaco-700"
                    />
                    <span className="text-sm text-slate-600">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="etiqueta">Notas</label>
                <textarea
                  className="campo-entrada resize-none"
                  rows={3}
                  value={form.notas}
                  onChange={(e) => setForm({...form, notas: e.target.value})}
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setMostrarModal(false)} className="btn-secundario">Cancelar</button>
              <button onClick={guardar} className="btn-primario">
                {editando ? 'Actualizar' : 'Registrar Contacto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-vista Campañas ───────────────────────────────────────────
function CampanasView() {
  const [campanas, setCampanas] = useState<any[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [form, setForm] = useState({ nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '', presupuesto: '' })

  useEffect(() => {
    api.get('/datos/campanas').then(({ data }) => setCampanas(data.campanas || []))
  }, [])

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es requerido')
    try {
      await api.post('/datos/campanas', { ...form, presupuesto: form.presupuesto ? parseFloat(form.presupuesto) : undefined })
      toast.success('Campaña creada')
      setMostrarModal(false)
      const { data } = await api.get('/datos/campanas')
      setCampanas(data.campanas || [])
    } catch { toast.error('Error al guardar') }
  }

  return (
    <div className="tarjeta">
      <div className="tarjeta-header flex items-center justify-between">
        <h2 className="font-semibold text-abaco-800">Campañas</h2>
        <button onClick={() => setMostrarModal(true)} className="btn-primario">+ Nueva Campaña</button>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campanas.map((c) => (
          <div key={c.id} className="border border-slate-200 rounded-xl p-4 hover:border-abaco-300 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-abaco-800 text-sm">{c.nombre}</h3>
              <span className={`badge ${c.activa ? 'badge-verde' : 'badge-gris'}`}>{c.estado}</span>
            </div>
            {c.descripcion && <p className="text-xs text-slate-500 mb-3">{c.descripcion}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <span>📋 {c.tareas_count || 0} tareas</span>
              <span>👥 {c.equipos_count || 0} equipos</span>
            </div>
          </div>
        ))}
        {campanas.length === 0 && (
          <div className="col-span-3 py-12 text-center text-slate-400">Sin campañas registradas</div>
        )}
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-5 border-b flex justify-between">
              <h3 className="font-semibold text-abaco-800">Nueva Campaña</h3>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="etiqueta">Nombre *</label><input className="campo-entrada" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} /></div>
              <div><label className="etiqueta">Descripción</label><textarea className="campo-entrada resize-none" rows={2} value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="etiqueta">Inicio</label><input type="date" className="campo-entrada" value={form.fecha_inicio} onChange={(e) => setForm({...form, fecha_inicio: e.target.value})} /></div>
                <div><label className="etiqueta">Fin</label><input type="date" className="campo-entrada" value={form.fecha_fin} onChange={(e) => setForm({...form, fecha_fin: e.target.value})} /></div>
              </div>
              <div><label className="etiqueta">Presupuesto (COP)</label><input type="number" className="campo-entrada" value={form.presupuesto} onChange={(e) => setForm({...form, presupuesto: e.target.value})} /></div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setMostrarModal(false)} className="btn-secundario">Cancelar</button>
              <button onClick={guardar} className="btn-primario">Crear Campaña</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-vista Tareas ─────────────────────────────────────────────
function TareasView() {
  const [tareas, setTareas] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', prioridad: 'media', asignado_a: '', fecha_limite: '' })

  const cargar = async () => {
    const [t, u] = await Promise.all([
      api.get('/datos/tareas'),
      api.get('/usuarios'),
    ])
    setTareas(t.data.tareas || [])
    setUsuarios(u.data.usuarios || [])
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.titulo.trim()) return toast.error('El título es requerido')
    try {
      await api.post('/datos/tareas', form)
      toast.success('Tarea creada')
      setMostrarModal(false)
      cargar()
    } catch { toast.error('Error al guardar') }
  }

  const cambiarEstado = async (id: string, estado: string) => {
    try {
      await api.put(`/datos/tareas/${id}`, { estado })
      cargar()
    } catch { toast.error('Error al actualizar') }
  }

  const PRIORIDAD_COLOR: Record<string, string> = {
    critica: 'badge-rojo', alta: 'badge-naranja', media: 'badge-oro', baja: 'badge-gris',
  }

  return (
    <div className="tarjeta">
      <div className="tarjeta-header flex items-center justify-between">
        <h2 className="font-semibold text-abaco-800">Tareas y Actividades</h2>
        <button onClick={() => setMostrarModal(true)} className="btn-primario">+ Nueva Tarea</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Tarea</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Prioridad</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Asignada a</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Límite</th>
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
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En progreso</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </td>
                <td className="px-6 py-3 text-slate-600 text-xs">
                  {t.fecha_limite ? formatearFecha(t.fecha_limite) : '—'}
                </td>
              </tr>
            ))}
            {tareas.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">Sin tareas registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
              <button onClick={guardar} className="btn-primario">Crear Tarea</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
