import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useSocialSocket } from '@/services/useSocialSocket'

export default function Layout() {
  // Monta la conexión social WebSocket para toda la app
  useSocialSocket()

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
