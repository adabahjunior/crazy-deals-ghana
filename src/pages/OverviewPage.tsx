import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PeriodSelector, { type DashboardPeriod } from '../components/agent/PeriodSelector'
import StatCard from '../components/agent/StatCard'
import { useAgentDashboard } from '../hooks/useAgentDashboard'
import { formatDate, formatMoney } from '../hooks/useTransactions'
import { getStoreUrl, copyToClipboard, getWhatsAppUrl } from '../lib/storeUtils'
import { Package, Wallet, Bot, Mail, UserPlus, Settings, ExternalLink, Copy, ShoppingBag, TrendingUp } from '../components/icons'
import { useSubAgentInfo } from '../hooks/useSubAgentInfo'

export default function OverviewPage() {
  const { profile } = useAuth()
  const [period, setPeriod] = useState<DashboardPeriod>('today')
  const { metrics, recentOrders, loading, refresh, wallet, storeActive, storeName } = useAgentDashboard(period)
  const { info: subAgentInfo } = useSubAgentInfo()
  const storeUrl = profile?.store_slug ? getStoreUrl(profile.store_slug) : ''

  const shareWhatsApp = () => {
    if (!storeUrl) return
    const url = getWhatsAppUrl(profile?.store_whatsapp ?? profile?.phone ?? '0244123456', `Buy data from ${storeName}: ${storeUrl}`)
    window.open(url, '_blank')
  }

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {storeName}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={refresh}>Refresh</button>
      </div>

      <PeriodSelector value={period} onChange={setPeriod} />

      {!storeActive && (
        <div className="dm-alert-banner">
          <div>
            <strong>Store Not Active</strong>
            <p>Activate your store to start selling and unlock the full agent dashboard.</p>
          </div>
          <Link to="/dashboard/my-store" className="btn btn-primary">Activate Now →</Link>
        </div>
      )}

      {subAgentInfo?.is_sub_agent && (
        <div className="dm-alert-banner" style={{ borderColor: 'rgba(59, 130, 246, 0.35)', background: 'rgba(59, 130, 246, 0.08)' }}>
          <div>
            <strong>Sub-Agent Account</strong>
            <p>
              You are linked to {subAgentInfo.parent_name} ({subAgentInfo.commission_pct}% commission on profit).
            </p>
          </div>
          <Link to="/dashboard/products" className="btn btn-secondary">View Products</Link>
        </div>
      )}

      <div className="dm-stats-grid">
        <StatCard label="Total Revenue" value={formatMoney(metrics.totalRevenue)} hint="+12% vs last period" icon={<TrendingUp />} accent />
        <StatCard label="Orders" value={String(metrics.totalOrders)} hint="Store orders in period" icon={<ShoppingBag />} />
        <StatCard label="Profit" value={formatMoney(metrics.totalProfit)} hint="+8% vs last period" icon={<Wallet />} accent />
        <StatCard label="Customers" value={String(metrics.uniqueCustomers)} hint="Unique buyers" icon={<UserPlus />} />
      </div>

      <div className="dm-wallet-card">
        <div>
          <p className="dm-wallet-label">Wallet Balance</p>
          <p className="dm-wallet-value">{formatMoney(wallet.availableBalance)}</p>
          <p className="dm-wallet-sub">Available to withdraw</p>
        </div>
        <div className="dm-wallet-meta">
          <div><span>Pending</span><strong>{formatMoney(wallet.pendingBalance)}</strong></div>
          <div><span>Total Earnings</span><strong>{formatMoney(wallet.totalEarnings)}</strong></div>
        </div>
        <Link to="/dashboard/withdrawals" className="btn btn-primary">Withdraw</Link>
      </div>

      <div className="dm-dashboard-grid">
        <div className="content-card">
          <div className="dm-card-head">
            <h2>Recent Orders</h2>
            <Link to="/dashboard/orders" className="btn btn-ghost">View all</Link>
          </div>
          {loading ? (
            <p style={{ color: 'var(--dm-surface-400)' }}>Loading orders...</p>
          ) : recentOrders.length === 0 ? (
            <div className="empty-state"><p>No orders yet.</p></div>
          ) : (
            <div className="dm-order-list">
              {recentOrders.map((order) => (
                <div key={order.id} className="dm-order-row">
                  <div>
                    <strong>{order.package_label}</strong>
                    <span>{order.customer_phone}</span>
                  </div>
                  <div className="dm-order-row-end">
                    <strong>{formatMoney(order.amount)}</strong>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="content-card">
          <h2>Quick Actions</h2>
          <div className="dm-quick-actions">
            <button type="button" className="btn btn-secondary" disabled={!storeUrl} onClick={() => storeUrl && copyToClipboard(storeUrl)}>
              <Copy /> Copy Link
            </button>
            <button type="button" className="btn btn-secondary" disabled={!storeUrl} onClick={shareWhatsApp}>
              WhatsApp
            </button>
            {storeUrl && (
              <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <ExternalLink /> View Store
              </a>
            )}
          </div>
          <div className="dm-quick-grid">
            <Link to="/dashboard/products" className="dm-quick-link"><Package /> Products</Link>
            <Link to="/dashboard/withdrawals" className="dm-quick-link"><Wallet /> Withdraw</Link>
            <Link to="/dashboard/whatsapp-bot" className="dm-quick-link"><Bot /> WhatsApp Bot</Link>
            <Link to="/dashboard/email-marketing" className="dm-quick-link"><Mail /> Email</Link>
            <Link to="/dashboard/sub-agents" className="dm-quick-link"><UserPlus /> Sub-Agents</Link>
            <Link to="/dashboard/settings" className="dm-quick-link"><Settings /> Settings</Link>
          </div>
        </div>
      </div>
    </>
  )
}
