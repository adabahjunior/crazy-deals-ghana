import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { DashboardPeriod } from '../components/agent/PeriodSelector'
import type { StoreOrder } from '../types/database'

export interface AgentDashboardMetrics {
  totalRevenue: number
  totalOrders: number
  totalProfit: number
  uniqueCustomers: number
}

function periodStart(period: DashboardPeriod): Date | null {
  const now = new Date()
  if (period === 'all') return null
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (period === 'week') start.setDate(start.getDate() - 7)
  if (period === 'month') start.setMonth(start.getMonth() - 1)
  return start
}

export function useAgentDashboard(period: DashboardPeriod) {
  const { profile, user } = useAuth()
  const [metrics, setMetrics] = useState<AgentDashboardMetrics>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProfit: 0,
    uniqueCustomers: 0,
  })
  const [recentOrders, setRecentOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const start = periodStart(period)
    const startIso = start?.toISOString()

    let query = supabase
      .from('store_orders')
      .select('*')
      .eq('store_user_id', user.id)
      .order('created_at', { ascending: false })

    if (startIso) query = query.gte('created_at', startIso)

    const { data: orders } = await query

    const list = orders ?? []
    const successOrders = list.filter((o) => o.status === 'success')
    const customers = new Set(successOrders.map((o) => o.customer_phone))

    setMetrics({
      totalRevenue: successOrders.reduce((sum, o) => sum + Number(o.amount), 0),
      totalOrders: list.length,
      totalProfit: successOrders.reduce((sum, o) => sum + Number(o.amount), 0),
      uniqueCustomers: customers.size,
    })
    setRecentOrders(list.slice(0, 5))
    setLoading(false)
  }, [user, period])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    metrics,
    recentOrders,
    loading,
    refresh,
    wallet: {
      availableBalance: profile?.store_balance ?? 0,
      pendingBalance: 0,
      totalEarnings: profile?.store_balance ?? 0,
    },
    storeActive: !!profile?.store_published,
    storeName: profile?.store_name ?? profile?.full_name ?? 'Your Store',
  }
}
