import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { StoreOrder, TransactionStatus } from '../types/database'
import { formatDate, formatMoney } from '../hooks/useTransactions'

type OrderFilter = 'all' | TransactionStatus

export default function StoreOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [search, setSearch] = useState('')

  const load = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('store_orders')
      .select('*')
      .eq('store_user_id', user.id)
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [user])

  const successOrders = orders.filter((o) => o.status === 'success')
  const totalRevenue = successOrders.reduce((sum, o) => sum + Number(o.amount), 0)

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const matchesFilter = filter === 'all' || order.status === filter
      const q = search.trim()
      const matchesSearch = !q || order.customer_phone.includes(q) || order.package_label.toLowerCase().includes(q.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [orders, filter, search])

  const filterTabs: { key: OrderFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: orders.length },
    { key: 'pending', label: 'Pending', count: orders.filter((o) => o.status === 'pending').length },
    { key: 'processing', label: 'Processing', count: orders.filter((o) => o.status === 'processing').length },
    { key: 'success', label: 'Completed', count: orders.filter((o) => o.status === 'success').length },
    { key: 'failed', label: 'Failed', count: orders.filter((o) => o.status === 'failed').length },
  ]

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Orders</h1>
          <p>Orders placed through your store</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={load}>Refresh</button>
      </div>

      <div className="dm-stats-grid dm-stats-grid-2">
        <div className="dm-stat-card">
          <span className="dm-stat-label">Total Revenue</span>
          <div className="dm-stat-value accent">{formatMoney(totalRevenue)}</div>
        </div>
        <div className="dm-stat-card">
          <span className="dm-stat-label">Total Orders</span>
          <div className="dm-stat-value">{orders.length}</div>
        </div>
      </div>

      <div className="content-card">
        <div className="dm-filter-tabs">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`dm-filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <input
            type="search"
            className="form-input"
            placeholder="Search by phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={{ color: 'var(--dm-surface-400)', marginTop: '1rem' }}>Loading orders...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No orders match this filter.</p></div>
        ) : (
          <div className="table-scroll" style={{ marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{order.customer_phone}</td>
                    <td>{order.package_label}</td>
                    <td>{formatMoney(order.amount)}</td>
                    <td>
                      {order.is_promo ? (
                        <span className="status-badge success">Promo</span>
                      ) : order.parent_agent_id ? (
                        <span className="status-badge info">Sub-Agent</span>
                      ) : (
                        'Regular'
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${order.status}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
