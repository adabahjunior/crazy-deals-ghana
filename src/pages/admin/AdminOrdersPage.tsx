import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import { formatMoney, formatDate } from '../../hooks/useTransactions'
import { useAdminOrders } from '../../hooks/useAdminData'
import type { AdminOrder } from '../../types/admin'

type Filter = 'all' | 'platform' | 'store' | 'pending' | 'success' | 'failed'

export default function AdminOrdersPage() {
  const { orders, loading, refresh } = useAdminOrders(500)
  const [filter, setFilter] = useState<Filter>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(refresh, 30000)
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_orders' }, refresh)
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const filtered = orders.filter((o) => {
    if (filter === 'all') return true
    if (filter === 'platform') return o.source === 'platform'
    if (filter === 'store') return o.source === 'store'
    return o.status === filter
  })

  const updateStatus = async (order: AdminOrder, status: AdminOrder['status']) => {
    setUpdating(order.id)
    const table = order.source === 'platform' ? 'transactions' : 'store_orders'
    await supabase.from(table).update({ status }).eq('id', order.id)
    await refresh()
    setUpdating(null)
  }

  return (
    <>
      <PageHeader
        title="Orders"
        description="All platform and store orders across the website"
      />

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-filter-bar">
          {(['all', 'platform', 'store', 'pending', 'success', 'failed'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button className="btn btn-ghost" onClick={refresh} style={{ marginLeft: 'auto' }}>
            Refresh
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          {filtered.length} order{filtered.length !== 1 ? 's' : ''} · Auto-refreshes every 30 seconds
        </p>
      </div>

      <div className="content-card">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading orders...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No orders match this filter.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>User / Store</th>
                  <th>Phone</th>
                  <th>Details</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={`${order.source}-${order.id}`}>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <span className={`status-badge ${order.source === 'platform' ? 'info' : 'warning'}`}>
                        {order.source === 'platform' ? 'Platform' : 'Store'}
                      </span>
                    </td>
                    <td>
                      {order.source === 'store' ? (
                        <>
                          <div>{order.store_name ?? order.user_name ?? '-'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.user_email}</div>
                        </>
                      ) : (
                        <>
                          <div>{order.user_name ?? '-'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.user_email}</div>
                        </>
                      )}
                    </td>
                    <td>{order.phone ?? order.customer_phone ?? '-'}</td>
                    <td>{order.description ?? order.package_label ?? '-'}</td>
                    <td>{formatMoney(order.amount)}</td>
                    <td>
                      <span className={`status-badge ${order.status}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <select
                        className="form-input admin-status-select"
                        value={order.status}
                        disabled={updating === order.id}
                        onChange={(e) => updateStatus(order, e.target.value as AdminOrder['status'])}
                      >
                        <option value="pending">Pending</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                      </select>
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
