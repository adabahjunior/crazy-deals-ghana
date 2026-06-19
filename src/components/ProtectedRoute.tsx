import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AuthLoading() {
  return (
    <div className="dm-auth-page">
      <div className="dm-auth-shell dm-auth-loading">
        <p>Loading...</p>
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  return <Outlet />
}

export function PublicRoute() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
