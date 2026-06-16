import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import type { StoreOrder } from '../types/database'
import { formatDate, formatMoney } from '../hooks/useTransactions'

export default function StoreOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('store_orders')
      .select('*')
      .eq('store_user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders(data ?? [])
        setLoading(false)
      })
  }, [user])

  return (
    <>
      <PageHeader
        title="Store Orders"
        description="Orders placed through your store"
      />

      <div className="content-card">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : orders.length === 0 ? (
          <div className="empty-state"><p>No store orders yet.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Package</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id.slice(0, 8).toUpperCase()}</td>
                  <td>{order.customer_phone}</td>
                  <td>{order.package_label}</td>
                  <td>{formatMoney(order.amount)}</td>
                  <td>{formatDate(order.created_at)}</td>
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
