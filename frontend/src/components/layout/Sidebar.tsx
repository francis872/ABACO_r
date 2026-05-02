import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import type { RolUsuario } from '@/types'

interface ItemNav {
  ruta: string
  etiqueta: string
  codigo: string
  rolesPermitidos?: RolUsuario[]
}

const navegacion: ItemNav[] = [
  { ruta: '/',            etiqueta: 'Dashboard',        codigo: '01' },
  { ruta: '/territorios', etiqueta: 'Territorios',      codigo: '02' },
  { ruta: '/datos',       etiqueta: 'Gestión de Datos', codigo: '03' },
  { ruta: '/analisis',    etiqueta: 'Análisis BI',      codigo: '04' },
  { ruta: '/mapa',        etiqueta: 'Mapa Territorial', codigo: '05' },
  { ruta: '/financiero',  etiqueta: 'Financiero',       codigo: '06' },
  { ruta: '/tareas',      etiqueta: 'Tareas',           codigo: '07' },
  { ruta: '/alertas',     etiqueta: 'Alertas',          codigo: '08' },
  { ruta: '/comunidad',   etiqueta: 'Comunidad',        codigo: '09' },
  { ruta: '/usuarios',    etiqueta: 'Usuarios',         codigo: '10', rolesPermitidos: ['superadmin', 'admin'] },
]

const JERARQUIA: Record<RolUsuario, number> = {
  superadmin: 6, admin: 5, estratega: 4, analista: 3, coordinador: 2, observador: 1,
}

const ETIQUETAS_ROL: Record<RolUsuario, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  estratega: 'Estratega',
  analista: 'Analista',
  coordinador: 'Coordinador',
  observador: 'Observador',
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario, cerrarSesion } = useAuthStore()

  const puedeVer = (item: ItemNav) => {
    if (!item.rolesPermitidos || !usuario) return true
    return item.rolesPermitidos.some((r) => JERARQUIA[usuario.rol] >= JERARQUIA[r])
  }

  const handleCerrarSesion = () => {
    cerrarSesion()
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  return (
    <aside className="w-56 flex flex-col bg-black border-r border-white/[0.08] shrink-0">

      {/* ── Logotipo ── */}
      <div className="px-6 py-7 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-oro-400 flex items-center justify-center shrink-0">
            <span className="text-black font-black text-sm leading-none">A</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-[0.18em] uppercase leading-none">
              ÁBACO
            </p>
            <p className="text-white/30 text-[9px] tracking-[0.15em] uppercase mt-1">
              Intel. Territorial
            </p>
          </div>
        </div>
      </div>

      {/* ── Navegación ── */}
      <nav className="flex-1 py-6 overflow-y-auto">
        <div className="px-6 mb-4">
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/25 font-medium">
            Módulos
          </p>
        </div>

        {navegacion.filter(puedeVer).map((item) => {
          const estaActivo = item.ruta === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.ruta)

          return (
            <NavLink
              key={item.ruta}
              to={item.ruta}
              className={`group flex items-center gap-3 px-6 py-2.5 transition-all duration-150
                ${estaActivo
                  ? 'text-white bg-white/[0.06] border-l-2 border-oro-400'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03] border-l-2 border-transparent'
                }`}
            >
              <span className={`text-[9px] font-mono tracking-wider shrink-0 ${estaActivo ? 'text-oro-400' : 'text-white/20 group-hover:text-white/30'}`}>
                {item.codigo}
              </span>
              <span className="text-[11px] font-medium tracking-[0.08em] uppercase">
                {item.etiqueta}
              </span>
            </NavLink>
          )
        })}
      </nav>

      {/* ── Perfil + logout ── */}
      {usuario && (
        <div className="border-t border-white/[0.08]">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 border border-white/20 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">
                  {usuario.nombre.charAt(0)}{usuario.apellido?.charAt(0)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-[11px] font-semibold truncate leading-tight">
                  {usuario.nombre} {usuario.apellido}
                </p>
                <p className="text-white/30 text-[9px] tracking-[0.12em] uppercase mt-0.5">
                  {ETIQUETAS_ROL[usuario.rol]}
                </p>
              </div>
            </div>
            <button
              onClick={handleCerrarSesion}
              className="w-full text-left text-[10px] tracking-[0.12em] uppercase text-white/25
                         hover:text-white/60 transition-colors duration-150 py-1"
            >
              Cerrar sesión →
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
