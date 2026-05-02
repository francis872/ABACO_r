import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import GestionDatos from '@/pages/datos/GestionDatos'
import Analisis from '@/pages/analisis/Analisis'
import Mapa from '@/pages/mapa/Mapa'
import Usuarios from '@/pages/usuarios/Usuarios'
import Financiero from '@/pages/financiero/Financiero'
import Alertas from '@/pages/alertas/Alertas'
import Territorios from '@/pages/territorios/Territorios'
import Tareas from '@/pages/tareas/Tareas'
import Comunidad from '@/pages/comunidad/Comunidad'

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const autenticado = useAuthStore((s) => s.autenticado)
  return autenticado ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const autenticado = useAuthStore((s) => s.autenticado)

  return (
    <Routes>
      <Route path="/login" element={autenticado ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/registro" element={autenticado ? <Navigate to="/" replace /> : <Register />} />

      <Route
        path="/"
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="territorios" element={<Territorios />} />
        <Route path="datos" element={<GestionDatos />} />
        <Route path="analisis" element={<Analisis />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="financiero" element={<Financiero />} />
        <Route path="tareas" element={<Tareas />} />
        <Route path="alertas" element={<Alertas />} />
        <Route path="comunidad" element={<Comunidad />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
