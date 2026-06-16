import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { formatMoney, formatDate } from '../../hooks/useTransactions'
import { useAdminStats } from '../../hooks/useAdminData'

export default function AdminOverviewPage() {
  const { stats, loading, error } = useAdminStats()

  if (loading) {
    return (
      <>
        <PageHeader title="Admin Overview" description="Site-wide statistics and health at a glance" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
      </>
    )
  }

  if (error || !stats) {
    return (
      <>
        <PageHeader title="Admin Overview" description="Site-wide statistics and health at a glance" />
        <div className="auth-error">{error ?? 'Failed to load dashboard'}</div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Website Overview"
        description="Revenue, orders, and platform activity at a glance"
      />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Revenue</div>
          <div className="value accent">{formatMoney(stats.total_revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Today&apos;s Revenue</div>
          <div className="value">{formatMoney(stats.today_revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Today&apos;s Orders</div>
          <div className="value">{stats.today_orders}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Orders</div>
          <div className="value">{stats.total_orders}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Users</div>
          <div className="value">{stats.total_users}</div>
        </div>
        <div className="stat-card">
          <div className="label">Pending Orders</div>
          <div className="value">{stats.pending_orders}</div>
        </div>
        <div className="stat-card">
          <div className="label">Platform Orders</div>
          <div className="value">{stats.total_platform_orders}</div>
        </div>
        <div className="stat-card">
          <div className="label">Store Orders</div>
          <div className="value">{stats.total_store_orders}</div>
        </div>
        <div className="stat-card">
          <div className="label">Wallet Top-ups Today</div>
          <div className="value">{formatMoney(stats.wallet_topups_today)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Stores</div>
          <div className="value">{stats.active_stores}</div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Sales Per Day (Last 14 Days)</h2>
        {stats.sales_per_day.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No sales data yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {stats.sales_per_day.map((day) => (
                <tr key={day.day}>
                  <td>{new Date(day.day).toLocaleDateString('en-GH', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                  <td>{day.orders}</td>
                  <td>{formatMoney(day.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2>Recent Orders</h2>
          <Link to="/admin/orders" className="btn btn-secondary">View All Orders</Link>
        </div>
        {stats.recent_orders.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No orders yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Customer</th>
                <th>Details</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_orders.map((order) => (
                <tr key={`${order.source}-${order.id}`}>
                  <td>{formatDate(order.created_at)}</td>
                  <td>
                    <span className={`status-badge ${order.source === 'platform' ? 'info' : 'warning'}`}>
                      {order.source === 'platform' ? 'Platform' : 'Store'}
                    </span>
                  </td>
                  <td>{order.source === 'store' ? order.customer_phone : (order.user_name ?? order.user_email ?? '-')}</td>
                  <td>{order.description ?? order.package_label ?? '-'}</td>
                  <td>{formatMoney(order.amount)}</td>
                  <td>
                    <span className={`status-badge ${order.status}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
