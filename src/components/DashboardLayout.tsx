import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  dashboardMainNav,
  dashboardToolsNav,
  dashboardAccountNav,
  dashboardMobileNav,
  dashboardMoreActivePrefixes,
  LogOut,
  Menu,
  Sparkles,
} from '../data/dashboardNavigation'
import { Store, ExternalLink, Copy, Bell, Shield } from './icons'
import { getStoreUrl, copyToClipboard } from '../lib/storeUtils'
import { formatMoney } from '../hooks/useTransactions'
import NotificationPopup from './NotificationPopup'
import SiteBanner from './SiteBanner'

function getInitials(name?: string | null) {
  if (!name) return 'U'
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
}

function NavLinkItem({
  item,
  collapsed,
  isActive,
  onNavigate,
}: {
  item: (typeof dashboardMainNav)[number]
  collapsed: boolean
  isActive: (path: string) => boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/dashboard'}
      className={`dm-nav-link ${isActive(item.path) ? 'active' : ''}`}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      <item.icon />
      {!collapsed && (
        <>
          <span>{item.label}</span>
          {item.badge && <span className="dm-nav-badge">{item.badge}</span>}
        </>
      )}
    </NavLink>
  )
}

export default function DashboardLayout() {
  const { profile, logout, isAdmin, isAgent } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const storeUrl = profile?.store_slug ? getStoreUrl(profile.store_slug) : ''
  const storeOpen = !!profile?.store_published

  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) setSidebarCollapsed(false)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  const mobileActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    if (path === '/dashboard/more') {
      return dashboardMoreActivePrefixes.some((p) => location.pathname.startsWith(p))
    }
    return location.pathname.startsWith(path)
  }

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  const copyStoreLink = async () => {
    if (!storeUrl) return
    await copyToClipboard(storeUrl)
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <div className={`agent-shell dm-admin ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className={`dm-sidebar-overlay ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`dm-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="dm-sidebar-top">
          <Link to="/dashboard" className="dm-sidebar-brand" onClick={() => setMobileOpen(false)}>
            <div className="dm-brand-icon"><Store /></div>
            {!sidebarCollapsed && (
              <div>
                <h1>Agent Store</h1>
                <p>{profile?.store_name ?? profile?.full_name ?? 'Dashboard'}</p>
              </div>
            )}
          </Link>
          <button type="button" className="dm-icon-btn dm-collapse-btn" onClick={() => setSidebarCollapsed((v) => !v)}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="dm-sidebar-nav">
          <div className="dm-nav-section">
            {!sidebarCollapsed && <p className="dm-nav-label">Main</p>}
            <div className="dm-nav-group">
              {dashboardMainNav.map((item) => (
                <NavLinkItem key={item.path} item={item} collapsed={sidebarCollapsed} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
              ))}
            </div>
          </div>
          <div className="dm-nav-section">
            {!sidebarCollapsed && <p className="dm-nav-label"><Sparkles className="dm-nav-sparkle" /> Tools</p>}
            <div className="dm-nav-group">
              {dashboardToolsNav.map((item) => (
                <NavLinkItem key={item.path} item={item} collapsed={sidebarCollapsed} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
              ))}
            </div>
          </div>
          <div className="dm-nav-section">
            {!sidebarCollapsed && <p className="dm-nav-label">Account</p>}
            <div className="dm-nav-group">
              {dashboardAccountNav.map((item) => (
                <NavLinkItem key={item.path} item={item} collapsed={sidebarCollapsed} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
              ))}
            </div>
          </div>
        </nav>

        <div className="dm-sidebar-footer">
          {storeUrl && (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="dm-view-store-btn">
              <ExternalLink />
              {!sidebarCollapsed && <span>View My Store</span>}
            </a>
          )}
          {isAdmin && (
            <Link to="/admin" className="dm-nav-link" onClick={() => setMobileOpen(false)}>
              <Shield />
              {!sidebarCollapsed && <span>Admin Panel</span>}
            </Link>
          )}
          <button type="button" className="dm-logout-btn" onClick={handleLogout}>
            <LogOut />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="dm-main">
        <header className="dm-topbar">
          <div className="dm-topbar-left">
            <button type="button" className="dm-icon-btn dm-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu />
            </button>
            <div className="dm-topbar-title">
              <span className="dm-topbar-kicker">Agent Dashboard</span>
              <strong>{profile?.store_name ?? 'CrazyDeals Ghana'}</strong>
            </div>
          </div>
          <div className="dm-topbar-right">
            {isAgent && (
              <span className={`dm-status-pill ${storeOpen ? 'online' : 'offline'}`}>
                {storeOpen ? 'Store Open' : 'Store Closed'}
              </span>
            )}
            <Link to="/dashboard/withdrawals" className="dm-wallet-pill">
              <WalletIcon />
              {formatMoney(profile?.store_balance ?? profile?.wallet_balance ?? 0)}
            </Link>
            {storeUrl && (
              <>
                <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="dm-icon-btn" title="View store">
                  <ExternalLink />
                </a>
                <button type="button" className="dm-icon-btn" onClick={copyStoreLink} title="Copy store link">
                  <Copy />
                </button>
              </>
            )}
            {linkCopied && <span className="dm-copy-feedback">Copied!</span>}
            <button type="button" className="dm-icon-btn dm-bell-btn" aria-label="Notifications">
              <Bell />
              <span className="dm-bell-dot" />
            </button>
            <div className="dm-user-menu">
              <button type="button" className="dm-user-btn" onClick={() => setMenuOpen((v) => !v)}>
                <div className="dm-avatar">{getInitials(profile?.full_name)}</div>
                <span className="dm-user-name">{profile?.full_name ?? 'User'}</span>
              </button>
              {menuOpen && (
                <>
                  <div className="dm-user-menu-backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="dm-user-dropdown">
                    <div className="dm-user-dropdown-head">
                      <p>{profile?.full_name ?? 'User'}</p>
                      <span>{profile?.email ?? ''}</span>
                    </div>
                    <Link to="/dashboard/settings" className="dm-dropdown-link" onClick={() => setMenuOpen(false)}>
                      <SettingsIcon />
                      Settings
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
            <SiteBanner />
            <NotificationPopup />
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="dm-bottom-nav">
        {dashboardMobileNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
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

function WalletIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
