import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSubAgents, useSubAgentOrders } from '../../hooks/useAgentTools'
import { formatDate, formatMoney } from '../../hooks/useTransactions'

export default function SubAgentOrdersPage() {
  const { user } = useAuth()
  const { subAgents, loading: agentsLoading } = useSubAgents(user?.id)
  const subAgentIds = useMemo(() => subAgents.map((a) => a.id), [subAgents])
  const { orders, loading: ordersLoading, refresh } = useSubAgentOrders(subAgentIds)

  const agentMap = useMemo(() => new Map(subAgents.map((a) => [a.id, a])), [subAgents])
  const totalRevenue = orders.filter((o) => o.status === 'success').reduce((s, o) => s + Number(o.amount), 0)

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Agent Orders</h1>
          <p>Monitor orders placed by your sub-agents</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={refresh}>Refresh</button>
      </div>

      <div className="dm-stats-grid dm-stats-grid-2">
        <div className="dm-stat-card">
          <span className="dm-stat-label">Sub-Agent Orders</span>
          <div className="dm-stat-value">{orders.length}</div>
        </div>
        <div className="dm-stat-card">
          <span className="dm-stat-label">Sub-Agent Revenue</span>
          <div className="dm-stat-value accent">{formatMoney(totalRevenue)}</div>
        </div>
      </div>

      <div className="content-card">
        {agentsLoading || ordersLoading ? (
          <p style={{ color: 'var(--dm-surface-400)' }}>Loading...</p>
        ) : subAgents.length === 0 ? (
          <div className="empty-state"><p>No sub-agents yet. Recruit agents to see their orders here.</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-state"><p>No sub-agent orders yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sub-Agent</th>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const agent = agentMap.get(order.store_user_id)
                  return (
                    <tr key={order.id}>
                      <td>{formatDate(order.created_at)}</td>
                      <td>{agent?.full_name ?? agent?.store_name ?? '—'}</td>
                      <td>{order.customer_phone}</td>
                      <td>{order.package_label}</td>
                      <td>{formatMoney(order.amount)}</td>
                      <td>
                        <span className={`status-badge ${order.status}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
