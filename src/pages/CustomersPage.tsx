import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatMoney } from '../hooks/useTransactions'
import { getWhatsAppUrl } from '../lib/storeUtils'
import type { StoreOrder } from '../types/database'

interface CustomerRow {
  phone: string
  orderCount: number
  totalSpent: number
  lastOrderAt: string
}

export default function CustomersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [search, setSearch] = useState('')
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

  const customers = useMemo(() => {
    const map = new Map<string, CustomerRow>()
    for (const order of orders) {
      const existing = map.get(order.customer_phone)
      if (!existing) {
        map.set(order.customer_phone, {
          phone: order.customer_phone,
          orderCount: 1,
          totalSpent: Number(order.amount),
          lastOrderAt: order.created_at,
        })
      } else {
        existing.orderCount += 1
        existing.totalSpent += Number(order.amount)
        if (order.created_at > existing.lastOrderAt) existing.lastOrderAt = order.created_at
      }
    }
    return [...map.values()].sort((a, b) => b.totalSpent - a.totalSpent)
  }, [orders])

  const filtered = customers.filter((c) => c.phone.includes(search.trim()))

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Customers</h1>
          <p>Buyers who ordered from your store</p>
        </div>
      </div>

      <div className="dm-stats-grid dm-stats-grid-3">
        <div className="dm-stat-card">
          <span className="dm-stat-label">Total Customers</span>
          <div className="dm-stat-value">{customers.length}</div>
        </div>
        <div className="dm-stat-card">
          <span className="dm-stat-label">Total Spent</span>
          <div className="dm-stat-value accent">{formatMoney(customers.reduce((s, c) => s + c.totalSpent, 0))}</div>
        </div>
        <div className="dm-stat-card">
          <span className="dm-stat-label">Avg. Order</span>
          <div className="dm-stat-value">
            {formatMoney(customers.length ? customers.reduce((s, c) => s + c.totalSpent, 0) / customers.reduce((s, c) => s + c.orderCount, 0) : 0)}
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="form-group">
          <label htmlFor="customerSearch">Search customers</label>
          <input id="customerSearch" className="form-input" placeholder="Phone number..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <p style={{ color: 'var(--dm-surface-400)' }}>Loading customers...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No customers yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Phone</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Last Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer, index) => (
                  <tr key={customer.phone}>
                    <td>{index === 0 ? '#1 TOP' : `#${index + 1}`}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.orderCount}</td>
                    <td>{formatMoney(customer.totalSpent)}</td>
                    <td>{formatDate(customer.lastOrderAt)}</td>
                    <td>
                      <a
                        href={getWhatsAppUrl(customer.phone, 'Hello from CrazyDeals!')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost"
                      >
                        WhatsApp
                      </a>
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
