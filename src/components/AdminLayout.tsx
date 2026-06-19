import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  adminMainNav,
  adminSystemNav,
  adminMobileNav,
  LogOut,
  Menu,
  ArrowLeft,
} from '../data/adminNavigation'
import { Shield } from './icons'

function getInitials(name?: string | null) {
  if (!name) return 'AD'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  const renderLink = (item: (typeof adminMainNav)[number]) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.path === '/admin'}
      className={`dm-nav-link ${isActive(item.path) ? 'active' : ''}`}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      <item.icon />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )

  return (
    <nav className="dm-sidebar-nav">
      <div className="dm-nav-section">
        {!collapsed && <p className="dm-nav-label">Main</p>}
        <div className="dm-nav-group">{adminMainNav.map(renderLink)}</div>
      </div>
      <div className="dm-nav-section">
        {!collapsed && <p className="dm-nav-label">Management</p>}
        <div className="dm-nav-group">{adminSystemNav.slice(0, 2).map(renderLink)}</div>
      </div>
      <div className="dm-nav-section">
        {!collapsed && <p className="dm-nav-label">System</p>}
        <div className="dm-nav-group">{adminSystemNav.slice(2).map(renderLink)}</div>
      </div>
    </nav>
  )
}

export default function AdminLayout() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const collapseOnMobile = () => {
      if (window.innerWidth < 1024) setSidebarCollapsed(false)
    }
    collapseOnMobile()
    window.addEventListener('resize', collapseOnMobile)
    return () => window.removeEventListener('resize', collapseOnMobile)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  const mobileActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin'
    if (path === '/admin/more') {
      return ['/admin/settings', '/admin/notifications'].some((p) => location.pathname.startsWith(p))
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className={`admin-shell dm-admin ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className={`dm-sidebar-overlay ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`dm-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="dm-sidebar-top">
          <Link to="/admin" className="dm-sidebar-brand" onClick={() => setMobileOpen(false)}>
            <div className="dm-brand-icon">
              <Shield />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1>CrazyDeals</h1>
                <p>Admin Panel</p>
              </div>
            )}
          </Link>
          <button
            type="button"
            className="dm-icon-btn dm-collapse-btn"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <SidebarNav collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} />

        <div className="dm-sidebar-footer">
          <Link to="/dashboard" className="dm-nav-link" onClick={() => setMobileOpen(false)}>
            <ArrowLeft />
            {!sidebarCollapsed && <span>User Dashboard</span>}
          </Link>
          <button type="button" className="dm-logout-btn" onClick={handleLogout}>
            <LogOut />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="dm-main">
        <header className="dm-topbar">
          <div className="dm-topbar-left">
            <button
              type="button"
              className="dm-icon-btn dm-mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu />
            </button>
            <div className="dm-topbar-title">
              <span className="dm-topbar-kicker">Administration</span>
              <strong>CrazyDeals Ghana</strong>
            </div>
          </div>

          <div className="dm-topbar-right">
            <span className="dm-status-pill online">Platform Online</span>
            <div className="dm-user-menu">
              <button type="button" className="dm-user-btn" onClick={() => setMenuOpen((v) => !v)}>
                <div className="dm-avatar">{getInitials(profile?.full_name)}</div>
                <span className="dm-user-name">{profile?.full_name ?? 'Admin'}</span>
              </button>
              {menuOpen && (
                <>
                  <div className="dm-user-menu-backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="dm-user-dropdown">
                    <div className="dm-user-dropdown-head">
                      <p>{profile?.full_name ?? 'Admin'}</p>
                      <span>{profile?.email ?? 'Administrator'}</span>
                    </div>
                    <Link to="/dashboard" className="dm-dropdown-link" onClick={() => setMenuOpen(false)}>
                      <ArrowLeft />
                      User Dashboard
                    </Link>
                    <button type="button" className="dm-dropdown-link danger" onClick={handleLogout}>
                      <LogOut />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="dm-content">
          <div className="dm-content-inner">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="dm-bottom-nav">
        {adminMobileNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            className={`dm-bottom-link ${mobileActive(item.path) ? 'active' : ''}`}
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
