import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { dashboardMoreLinks, dashboardMoreTools, LogOut } from '../data/dashboardNavigation'

export default function MorePage() {
  const { logout } = useAuth()

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>More</h1>
          <p>Tools, settings, and additional features</p>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1rem' }}>
        <h2>Tools</h2>
        <div className="dm-more-grid">
          {dashboardMoreTools.map((item) => (
            <Link key={item.path} to={item.path} className="dm-more-link">
              <item.icon />
              <span>{item.label}</span>
              {item.badge && <em>{item.badge}</em>}
            </Link>
          ))}
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1rem' }}>
        <h2>More</h2>
        <div className="dm-more-grid">
          {dashboardMoreLinks.map((item) => (
            <Link key={item.path} to={item.path} className="dm-more-link">
              <item.icon />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="content-card">
        <a
          href="https://wa.me/233241234567"
          target="_blank"
          rel="noopener noreferrer"
          className="dm-more-link"
          style={{ marginBottom: '1rem' }}
        >
          WhatsApp Support
        </a>

        <p className="dm-version-footer">Agent Dashboard v1.0.0 • © {new Date().getFullYear()} CrazyDeals Ghana</p>
        <button type="button" className="dm-logout-btn" onClick={logout}>
          <LogOut />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  )
}
