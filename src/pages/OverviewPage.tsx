import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import { Smartphone, Radio, Signal, Wallet } from '../components/icons'
import { useTransactions, formatDate, formatMoney } from '../hooks/useTransactions'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function OverviewPage() {
  const { profile } = useAuth()
  const { transactions, loading } = useTransactions(5)
  const [todaySales, setTodaySales] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)

  useEffect(() => {
    if (!profile) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    supabase
      .from('transactions')
      .select('amount, type, created_at')
      .eq('user_id', profile.id)
      .eq('type', 'data_purchase')
      .gte('created_at', today.toISOString())
      .then(({ data }) => {
        setTodaySales(data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0)
      })

    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('type', 'data_purchase')
      .then(({ count }) => setTotalOrders(count ?? 0))
  }, [profile])

  return (
    <>
      <PageHeader
        title={`Hello, ${profile?.full_name ?? 'User'}!`}
        description="Welcome to your CrazyDeals Ghana dashboard"
      />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Wallet Balance</div>
          <div className="value accent">{formatMoney(profile?.wallet_balance ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Today's Sales</div>
          <div className="value">{formatMoney(todaySales)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Orders</div>
          <div className="value">{totalOrders}</div>
        </div>
        <div className="stat-card">
          <div className="label">Store Earnings</div>
          <div className="value">{formatMoney(profile?.store_balance ?? 0)}</div>
        </div>
      </div>

      <div className="content-card">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <Link to="/dashboard/buy-mtn" className="quick-action">
            <div className="quick-action-icon"><Smartphone /></div>
            <span className="quick-action-text">Buy MTN Data</span>
          </Link>
          <Link to="/dashboard/buy-airtel-ishare" className="quick-action">
            <div className="quick-action-icon"><Radio /></div>
            <span className="quick-action-text">Buy AirtelTigo iShare</span>
          </Link>
          <Link to="/dashboard/buy-telecel" className="quick-action">
            <div className="quick-action-icon"><Signal /></div>
            <span className="quick-action-text">Buy Telecel Data</span>
          </Link>
          <Link to="/dashboard/wallet" className="quick-action">
            <div className="quick-action-icon"><Wallet /></div>
            <span className="quick-action-text">Top Up Wallet</span>
          </Link>
        </div>
      </div>

      <div className="content-card">
        <h2>Recent Transactions</h2>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : transactions.length === 0 ? (
          <div className="empty-state"><p>No transactions yet.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{formatDate(tx.created_at)}</td>
                  <td>{tx.description ?? tx.type}</td>
                  <td>{formatMoney(tx.amount)}</td>
                  <td>
                    <span className={`status-badge ${tx.status}`}>
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
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
