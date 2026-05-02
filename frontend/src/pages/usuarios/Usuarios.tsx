import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { formatearFecha } from '@/utils/formato'
import type { Usuario, RolUsuario } from '@/types'

const ROLES: RolUsuario[] = ['superadmin', 'admin', 'estratega', 'analista', 'coordinador', 'observador']

const ROL_BADGE: Record<string, string> = {
  superadmin: 'badge-rojo',
  admin: 'badge-naranja',
  estratega: 'badge-azul',
  analista: 'badge-azul',
  coordinador: 'badge-verde',
  observador: 'badge-gris',
}

const FORM_VACIO = {
  nombre: '', apellido: '', email: '', password: '', rol: 'observador' as RolUsuario,
  cargo: '', departamento: '', telefono: '',
}

export default function Usuarios() {
  const { usuario: yo } = useAuthStore()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ ...FORM_VACIO })

  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/usuarios')
      setUsuarios(data.usuarios || [])
    } catch {
      toast.error('Error al cargar usuarios')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setForm({ ...FORM_VACIO })
    setMostrarModal(true)
  }

  const abrirEditar = (u: Usuario) => {
    setEditando(u)
    setForm({
      nombre: u.nombre,
      apellido: u.apellido || '',
      email: u.email,
      password: '',
      rol: u.rol,
      cargo: u.cargo || '',
      departamento: u.departamento || '',
      telefono: u.telefono || '',
    })
    setMostrarModal(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es requerido')
    if (!form.email.trim()) return toast.error('El email es requerido')
    if (!editando && !form.password.trim()) return toast.error('La contraseña es requerida')

    const payload: any = {
      nombre: form.nombre,
      apellido: form.apellido || undefined,
      email: form.email,
      rol: form.rol,
      cargo: form.cargo || undefined,
      departamento: form.departamento || undefined,
      telefono: form.telefono || undefined,
    }
    if (form.password) payload.password = form.password

    try {
      if (editando) {
        await api.put(`/usuarios/${editando.id}`, payload)
        toast.success('Usuario actualizado')
      } else {
        await api.post('/usuarios', payload)
        toast.success('Usuario creado')
      }
      setMostrarModal(false)
      cargar()
    } catch (err: any) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar')
    }
  }

  const toggleActivo = async (u: Usuario) => {
    if (u.id === yo?.id) return toast.error('No puedes desactivar tu propia cuenta')
    try {
      await api.delete(`/usuarios/${u.id}`)
      toast.success(`Usuario ${u.activo ? 'desactivado' : 'activado'}`)
      cargar()
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  return (
    <div className="space-y-5">
      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="tarjeta p-5">
          <p className="etiqueta">Total Usuarios</p>
          <p className="text-3xl font-bold text-abaco-800">{usuarios.length}</p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Activos</p>
          <p className="text-3xl font-bold text-emerald-600">{usuarios.filter((u) => u.activo).length}</p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Inactivos</p>
          <p className="text-3xl font-bold text-red-500">{usuarios.filter((u) => !u.activo).length}</p>
        </div>
        <div className="tarjeta p-5">
          <p className="etiqueta">Admins</p>
          <p className="text-3xl font-bold text-orange-600">
            {usuarios.filter((u) => u.rol === 'admin' || u.rol === 'superadmin').length}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="tarjeta">
        <div className="tarjeta-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-abaco-800">Gestión de Usuarios</h2>
            <p className="text-xs text-slate-400 mt-0.5">Solo administradores pueden gestionar usuarios</p>
          </div>
          <button onClick={abrirNuevo} className="btn-primario">+ Nuevo Usuario</button>
        </div>
        <div className="overflow-x-auto">
          {cargando ? (
            <div className="py-12 text-center text-slate-400 text-sm">Cargando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {['Usuario', 'Email', 'Rol', 'Cargo', 'Último Acceso', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.activo ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-abaco-100 flex items-center justify-center text-abaco-700 font-semibold text-sm">
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-abaco-800">{u.nombre} {u.apellido}</p>
                          {u.departamento && <p className="text-xs text-slate-400">{u.departamento}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{u.email}</td>
                    <td className="px-6 py-3">
                      <span className={`badge ${ROL_BADGE[u.rol] || 'badge-gris'} capitalize`}>{u.rol}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{u.cargo || '—'}</td>
                    <td className="px-6 py-3 text-slate-400 text-xs">
                      {u.ultimo_acceso ? formatearFecha(u.ultimo_acceso) : 'Nunca'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`badge ${u.activo ? 'badge-verde' : 'badge-rojo'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => abrirEditar(u)} className="btn-secundario py-1 text-xs">Editar</button>
                        {u.id !== yo?.id && (
                          <button
                            onClick={() => toggleActivo(u)}
                            className={`py-1 text-xs px-3 rounded-lg font-medium transition-colors border
                              ${u.activo
                                ? 'text-red-600 border-red-200 hover:bg-red-50'
                                : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                              }`}
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">Sin usuarios registrados</td>
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
              <h3 className="font-semibold text-abaco-800">{editando ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Nombre *</label>
                  <input className="campo-entrada" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="etiqueta">Apellido</label>
                  <input className="campo-entrada" value={form.apellido} onChange={(e) => setForm({...form, apellido: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="etiqueta">Email *</label>
                <input type="email" className="campo-entrada" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </div>
              <div>
                <label className="etiqueta">{editando ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <input type="password" className="campo-entrada" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder={editando ? 'Sin cambios' : 'Mínimo 8 caracteres'} />
              </div>
              <div>
                <label className="etiqueta">Rol</label>
                <select className="campo-entrada" value={form.rol} onChange={(e) => setForm({...form, rol: e.target.value as RolUsuario})}>
                  {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="etiqueta">Cargo</label>
                  <input className="campo-entrada" value={form.cargo} onChange={(e) => setForm({...form, cargo: e.target.value})} placeholder="Ej: Coordinador Regional" />
                </div>
                <div>
                  <label className="etiqueta">Departamento</label>
                  <input className="campo-entrada" value={form.departamento} onChange={(e) => setForm({...form, departamento: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="etiqueta">Teléfono</label>
                <input className="campo-entrada" value={form.telefono} onChange={(e) => setForm({...form, telefono: e.target.value})} />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setMostrarModal(false)} className="btn-secundario">Cancelar</button>
              <button onClick={guardar} className="btn-primario">{editando ? 'Actualizar' : 'Crear Usuario'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
