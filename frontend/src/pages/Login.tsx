import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'

interface FormLogin {
  email: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const establecerSesion = useAuthStore((s) => s.establecerSesion)
  const [cargando, setCargando] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormLogin>()

  const onSubmit = async (datos: FormLogin) => {
    setCargando(true)
    try {
      const { data } = await api.post('/auth/login', datos)
      if (data.exito) {
        establecerSesion(data.usuario, data.token)
        toast.success(`Acceso concedido`)
        navigate('/')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.mensaje || 'Credenciales incorrectas')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex">

      {/* ── Panel izquierdo: branding dramático ── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-16 overflow-hidden">

        {/* Grid de fondo decorativo */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Círculo decorativo fondo */}
        <div
          className="absolute right-[-120px] top-[-120px] w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
        />

        {/* Contenido */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-20">
            <div className="w-8 h-8 bg-oro-400 flex items-center justify-center">
              <span className="text-black font-black text-sm leading-none">A</span>
            </div>
            <span className="text-white/60 text-xs tracking-[0.25em] uppercase font-medium">ÁBACO</span>
          </div>

          <h1 className="text-7xl font-bold text-white leading-[0.95] tracking-tight mb-8">
            INTELI-<br />
            GENCIA<br />
            <span className="text-oro-400">TERRI-<br />TORIAL</span>
          </h1>

          <div className="w-12 h-px bg-white/20 mb-6" />

          <p className="text-white/40 text-sm leading-relaxed max-w-sm tracking-wide">
            Centraliza datos electorales, analiza territorios y toma
            decisiones estratégicas basadas en información real del campo.
          </p>
        </div>

        {/* Módulos en la parte inferior */}
        <div className="relative z-10">
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/20 mb-4 font-medium">
            Módulos disponibles
          </p>
          <div className="grid grid-cols-2 gap-px bg-white/[0.06]">
            {[
              ['Georreferenciación', 'PostGIS + Leaflet'],
              ['Business Intelligence', 'Recharts + KPIs'],
              ['Control Financiero', 'Presupuesto real'],
              ['Alertas Estratégicas', 'Tiempo real'],
            ].map(([titulo, sub]) => (
              <div key={titulo} className="bg-black px-4 py-3">
                <p className="text-white/70 text-xs font-medium tracking-wide">{titulo}</p>
                <p className="text-white/25 text-[10px] tracking-wide mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className="flex-1 flex items-center justify-center p-10 border-l border-white/[0.06]">
        <div className="w-full max-w-sm">

          {/* Logo móvil */}
          <div className="flex items-center gap-3 mb-12 lg:hidden">
            <div className="w-8 h-8 bg-oro-400 flex items-center justify-center">
              <span className="text-black font-black text-sm">A</span>
            </div>
            <span className="text-white text-xs tracking-[0.25em] uppercase font-medium">ÁBACO</span>
          </div>

          {/* Encabezado */}
          <div className="mb-10">
            <p className="text-[10px] tracking-[0.25em] uppercase text-white/30 font-medium mb-3">
              Acceso restringido
            </p>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Iniciar sesión
            </h2>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 font-medium mb-3">
                Correo electrónico
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="usuario@dominio.com"
                className={`w-full bg-transparent border-0 border-b py-2.5 text-sm text-white
                  placeholder:text-white/20 focus:outline-none transition-colors duration-200
                  ${errors.email
                    ? 'border-red-500/60 focus:border-red-400'
                    : 'border-white/15 focus:border-white/50'
                  }`}
                {...register('email', {
                  required: 'Requerido',
                  pattern: { value: /^\S+@\S+$/, message: 'Email inválido' },
                })}
              />
              {errors.email && (
                <p className="mt-2 text-[10px] tracking-wide text-red-400/80">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 font-medium mb-3">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className={`w-full bg-transparent border-0 border-b py-2.5 text-sm text-white pr-16
                    placeholder:text-white/20 focus:outline-none transition-colors duration-200
                    ${errors.password
                      ? 'border-red-500/60 focus:border-red-400'
                      : 'border-white/15 focus:border-white/50'
                    }`}
                  {...register('password', { required: 'Requerida' })}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] tracking-[0.15em] uppercase
                             text-white/25 hover:text-white/60 transition-colors"
                >
                  {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-[10px] tracking-wide text-red-400/80">{errors.password.message}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={cargando}
                className="w-full border border-white text-white py-3.5 text-xs tracking-[0.2em] uppercase
                           font-medium hover:bg-white hover:text-black transition-colors duration-200
                           disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {cargando ? (
                  <>
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    Verificando
                  </>
                ) : (
                  <>Acceder al sistema →</>
                )}
              </button>
            </div>
          </form>

          {/* Registro */}
          <div className="mt-10 pt-8 border-t border-white/[0.07]">
            <p className="text-[11px] text-white/30 tracking-wide">
              ¿Sin cuenta?{' '}
              <Link
                to="/registro"
                className="text-white/60 hover:text-white transition-colors underline underline-offset-4 decoration-white/20"
              >
                Crear acceso
              </Link>
            </p>
          </div>

          <p className="mt-8 text-[9px] tracking-[0.15em] uppercase text-white/15">
            ÁBACO v1.0 — Plataforma de Inteligencia Territorial
          </p>
        </div>
      </div>
    </div>
  )
}
