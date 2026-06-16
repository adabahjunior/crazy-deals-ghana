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

export function AdminRoute() {
  const { isAuthenticated, isAdmin, loading, profile } = useAuth()

  if (loading || (isAuthenticated && !profile)) return <AuthLoading />
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
