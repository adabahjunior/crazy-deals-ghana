import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { navItems, LogOut, Menu, X } from '../data/navigation'
import { Shield } from './icons'
import NotificationPopup from './NotificationPopup'
import SiteBanner from './SiteBanner'

export default function DashboardLayout() {
  const { profile, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const closeSidebar = () => setSidebarOpen(false)

  const sections = [...new Set(navItems.map((item) => item.section))]

  return (
    <div className="dashboard-layout">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            Crazy<span>Deals</span>
          </div>
          <div className="sidebar-user">
            Welcome, {profile?.full_name ?? 'User'}
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section}>
              <div className="nav-section-label">{section}</div>
              {navItems
                .filter((item) => item.section === section)
                .map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/dashboard'}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={closeSidebar}
                  >
                    <item.icon />
                    {item.label}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {isAdmin && (
            <Link to="/admin" className="nav-link admin-panel-link" onClick={closeSidebar}>
              <Shield />
              Admin Panel
            </Link>
          )}
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut />
            Logout
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="mobile-header">
          <div className="mobile-brand">
            Crazy<span>Deals</span>
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
          <SiteBanner />
          <NotificationPopup />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
