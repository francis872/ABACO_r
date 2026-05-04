import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'

interface FormRegistro {
  nombre: string
  apellido: string
  email: string
  password: string
  confirmarPassword: string
}

export default function Register() {
  const navigate = useNavigate()
  const establecerSesion = useAuthStore((s) => s.establecerSesion)
  const [cargando, setCargando] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormRegistro>()

  const password = watch('password')

  const onSubmit = async (datos: FormRegistro) => {
    setCargando(true)
    try {
      const { data } = await api.post('/auth/registro', {
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        password: datos.password,
      })
      if (data.exito) {
        establecerSesion(data.usuario, data.token)
        toast.success('Cuenta creada. Bienvenido.')
        navigate('/')
      }
    } catch (err: any) {
      if (!err.response) {
        toast.error('No se pudo conectar al servidor. Verifica tu conexión.')
        return
      }
      const { data } = err.response
      // Mostrar primer error de validación si existe
      if (data?.errores?.length) {
        toast.error(data.errores[0].msg)
      } else {
        toast.error(data?.mensaje || 'Error al crear la cuenta')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex">

      {/* Panel izquierdo */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-16 overflow-hidden border-r border-white/[0.06]">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-20">
            <div className="w-8 h-8 bg-oro-400 flex items-center justify-center">
              <span className="text-black font-black text-sm">A</span>
            </div>
            <span className="text-white/50 text-xs tracking-[0.25em] uppercase font-medium">ABACO</span>
          </div>
          <h1 className="text-6xl font-bold text-white leading-[0.95] tracking-tight mb-8">
            UNETE<br />A LA<br /><span className="text-oro-400">PLATA-<br />FORMA</span>
          </h1>
          <div className="w-12 h-px bg-white/15 mb-6" />
          <p className="text-white/35 text-sm leading-relaxed tracking-wide max-w-xs">
            Crea tu cuenta y accede a mapas en tiempo real,
            analisis estrategicos y datos territoriales.
          </p>
        </div>
        <div className="relative z-10">
          <p className="text-[9px] tracking-[0.25em] uppercase text-white/20 mb-3 font-medium">Tu rol inicial</p>
          <div className="border border-white/[0.08] px-4 py-3">
            <p className="text-white/60 text-xs font-medium tracking-wide">Observador</p>
            <p className="text-white/25 text-[10px] mt-1 tracking-wide">
              Acceso de lectura a mapas, territorios y analisis. Un administrador puede elevar tu rol.
            </p>
          </div>
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="w-full max-w-sm">

          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-oro-400 flex items-center justify-center">
              <span className="text-black font-black text-sm">A</span>
            </div>
            <span className="text-white text-xs tracking-[0.25em] uppercase">ABACO</span>
          </div>

          <div className="mb-10">
            <p className="text-[10px] tracking-[0.25em] uppercase text-white/30 font-medium mb-3">Nuevo acceso</p>
            <h2 className="text-3xl font-bold text-white tracking-tight">Crear cuenta</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 font-medium mb-3">Nombre</label>
                <input
                  type="text" autoComplete="given-name" placeholder="Juan"
                  className={`w-full bg-transparent border-0 border-b py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors duration-200 ${errors.nombre ? 'border-red-500/60' : 'border-white/15 focus:border-white/50'}`}
                  {...register('nombre', { required: 'Requerido', minLength: { value: 2, message: 'Min. 2' } })}
                />
                {errors.nombre && <p className="mt-1.5 text-[10px] text-red-400/80">{errors.nombre.message}</p>}
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 font-medium mb-3">Apellido</label>
                <input
                  type="text" autoComplete="family-name" placeholder="Perez"
                  className={`w-full bg-transparent border-0 border-b py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors duration-200 ${errors.apellido ? 'border-red-500/60' : 'border-white/15 focus:border-white/50'}`}
                  {...register('apellido', { required: 'Requerido', minLength: { value: 2, message: 'Min. 2' } })}
                />
                {errors.apellido && <p className="mt-1.5 text-[10px] text-red-400/80">{errors.apellido.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 font-medium mb-3">Correo electronico</label>
              <input
                type="email" autoComplete="email" placeholder="tu@correo.com"
                className={`w-full bg-transparent border-0 border-b py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors duration-200 ${errors.email ? 'border-red-500/60' : 'border-white/15 focus:border-white/50'}`}
                {...register('email', { required: 'Requerido', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email invalido' } })}
              />
              {errors.email && <p className="mt-1.5 text-[10px] text-red-400/80">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 font-medium mb-3">Contrasena</label>
              <input
                type="password" autoComplete="new-password" placeholder="Minimo 8 caracteres"
                className={`w-full bg-transparent border-0 border-b py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors duration-200 ${errors.password ? 'border-red-500/60' : 'border-white/15 focus:border-white/50'}`}
                {...register('password', { required: 'Requerida', minLength: { value: 8, message: 'Minimo 8 caracteres' } })}
              />
              {errors.password && <p className="mt-1.5 text-[10px] text-red-400/80">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-white/35 font-medium mb-3">Confirmar contrasena</label>
              <input
                type="password" autoComplete="new-password" placeholder="Repite tu contrasena"
                className={`w-full bg-transparent border-0 border-b py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors duration-200 ${errors.confirmarPassword ? 'border-red-500/60' : 'border-white/15 focus:border-white/50'}`}
                {...register('confirmarPassword', {
                  required: 'Confirma tu contrasena',
                  validate: (v) => v === password || 'Las contrasenas no coinciden',
                })}
              />
              {errors.confirmarPassword && <p className="mt-1.5 text-[10px] text-red-400/80">{errors.confirmarPassword.message}</p>}
            </div>

            <div className="pt-2">
              <button
                type="submit" disabled={cargando}
                className="w-full border border-white text-white py-3.5 text-xs tracking-[0.2em] uppercase font-medium hover:bg-white hover:text-black transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {cargando ? (
                  <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />Creando cuenta</>
                ) : <>Crear mi cuenta &rarr;</>}
              </button>
            </div>
          </form>

          <div className="mt-10 pt-8 border-t border-white/[0.07]">
            <p className="text-[11px] text-white/30 tracking-wide">
              Ya tienes acceso?{' '}
              <Link to="/login" className="text-white/60 hover:text-white transition-colors underline underline-offset-4 decoration-white/20">
                Iniciar sesion
              </Link>
            </p>
          </div>

          <p className="mt-8 text-[9px] tracking-[0.15em] uppercase text-white/15">
            ABACO v1.0 - Plataforma de Inteligencia Territorial
          </p>
        </div>
      </div>
    </div>
  )
}
