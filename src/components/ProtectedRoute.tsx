import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AuthLoading() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}

export function PublicRoute() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
