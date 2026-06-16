import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { adminNavItems, LogOut, Menu, X, ArrowLeft } from '../data/adminNavigation'

export default function AdminLayout() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="dashboard-layout admin-layout">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand admin-brand">
            Admin <span>Panel</span>
          </div>
          <div className="sidebar-user">
            {profile?.full_name ?? 'Admin'}
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Management</div>
          {adminNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link to="/dashboard" className="nav-link" onClick={() => setSidebarOpen(false)}>
            <ArrowLeft />
            User Dashboard
          </Link>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut />
            Logout
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="mobile-header">
          <div className="mobile-brand admin-brand">
            Admin <span>Panel</span>
          </div>
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X /> : <Menu />}
          </button>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
