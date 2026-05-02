import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import CampanaNotificaciones from '@/components/social/CampanaNotificaciones'

const TITULOS: Record<string, string> = {
  '/':            'Dashboard Ejecutivo',
  '/territorios': 'Territorios',
  '/datos':       'Gestión de Datos',
  '/analisis':    'Análisis & BI',
  '/mapa':        'Mapa Territorial',
  '/financiero':  'Control Financiero',
  '/tareas':      'Gestión de Tareas',
  '/alertas':     'Alertas Estratégicas',
  '/comunidad':   'Comunidad',
  '/usuarios':    'Usuarios y Accesos',
}

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario, cerrarSesion } = useAuthStore()

  const titulo = TITULOS[location.pathname] || 'ÁBACO'

  const handleCerrarSesion = () => {
    cerrarSesion()
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  return (
    <header className="h-12 bg-black border-b border-white/[0.08] flex items-center justify-between px-8 shrink-0">

      {/* Título de página */}
      <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-white/40">
        {titulo}
      </p>

      {/* Controles derecha */}
      <div className="flex items-center gap-8">

        {/* Indicador live */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] tracking-[0.18em] uppercase text-white/25 font-medium">
            Sistema activo
          </span>
        </div>

        {/* Fecha */}
        <span className="hidden md:block text-[9px] tracking-[0.12em] uppercase text-white/20">
          {new Date().toLocaleDateString('es-CO', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </span>

        {/* Notificaciones */}
          <CampanaNotificaciones />

          {/* Usuario + logout */}
        <div className="relative group">
          <button className="flex items-center gap-2.5 py-1 transition-opacity hover:opacity-70">
            <div className="w-6 h-6 border border-white/20 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold leading-none">
                {usuario?.nombre?.charAt(0)}{usuario?.apellido?.charAt(0)}
              </span>
            </div>
            <span className="hidden sm:block text-[10px] tracking-[0.1em] uppercase text-white/50 font-medium">
              {usuario?.nombre}
            </span>
            <span className="text-white/25 text-[8px]">▾</span>
          </button>

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-44 bg-abaco-900 border border-white/[0.1]
                          opacity-0 invisible group-hover:opacity-100 group-hover:visible
                          transition-all duration-150 z-50">
            <div className="p-1">
              <div className="px-3 py-2 border-b border-white/[0.07] mb-1">
                <p className="text-[10px] text-white/60 tracking-wide truncate">
                  {usuario?.email}
                </p>
                <p className="text-[9px] tracking-[0.12em] uppercase text-white/25 mt-0.5">
                  {usuario?.rol}
                </p>
              </div>
              <button
                onClick={handleCerrarSesion}
                className="w-full flex items-center gap-2 px-3 py-2 text-[10px] tracking-[0.1em] uppercase
                           text-white/40 hover:text-white/90 hover:bg-white/[0.05] transition-colors duration-150"
              >
                <span>→</span>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
