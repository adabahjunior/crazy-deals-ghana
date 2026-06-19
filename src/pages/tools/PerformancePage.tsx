import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import PeriodSelector, { type DashboardPeriod } from '../../components/agent/PeriodSelector'
import StatCard from '../../components/agent/StatCard'
import { useAgentDashboard } from '../../hooks/useAgentDashboard'
import { useSubAgents, useSubAgentOrders } from '../../hooks/useAgentTools'
import { formatDate, formatMoney } from '../../hooks/useTransactions'

export default function PerformancePage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<DashboardPeriod>('month')
  const { metrics, loading } = useAgentDashboard(period)
  const { subAgents } = useSubAgents(user?.id)
  const subAgentIds = useMemo(() => subAgents.map((a) => a.id), [subAgents])
  const { orders: subOrders } = useSubAgentOrders(subAgentIds)

  const subAgentRevenue = subOrders
    .filter((o) => o.status === 'success')
    .reduce((s, o) => s + Number(o.amount), 0)

  const dailyRevenue = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>()
    for (const order of subOrders) {
      const day = order.created_at.slice(0, 10)
      const cur = map.get(day) ?? { orders: 0, revenue: 0 }
      cur.orders += 1
      if (order.status === 'success') cur.revenue += Number(order.amount)
      map.set(day, cur)
    }
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 14)
  }, [subOrders])

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Performance</h1>
          <p>Track store revenue, profit, and customer growth</p>
        </div>
      </div>
      <PeriodSelector value={period} onChange={setPeriod} />
      <div className="dm-stats-grid">
        <StatCard label="Total Orders" value={loading ? '—' : String(metrics.totalOrders)} />
        <StatCard label="Total Profit" value={loading ? '—' : formatMoney(metrics.totalProfit)} accent />
        <StatCard label="Direct Sales" value={loading ? '—' : formatMoney(metrics.totalRevenue)} />
        <StatCard label="Sub-Agent Sales" value={formatMoney(subAgentRevenue)} hint={`${subAgents.length} sub-agents`} />
      </div>
      <div className="content-card">
        <h2>Revenue Trend (Sub-Agent Orders)</h2>
        {dailyRevenue.length === 0 ? (
          <p style={{ color: 'var(--dm-surface-400)' }}>No sub-agent sales data yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dailyRevenue.map(([day, stats]) => (
                  <tr key={day}>
                    <td>{formatDate(day)}</td>
                    <td>{stats.orders}</td>
                    <td>{formatMoney(stats.revenue)}</td>
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
