import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import Sidebar from './Sidebar'

export default function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-950">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
