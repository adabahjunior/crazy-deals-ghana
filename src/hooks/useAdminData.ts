import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AdminDashboardStats, AdminOrder } from '../types/admin'

export function useAdminStats() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats')
    if (rpcError) {
      setError(rpcError.message)
      setStats(null)
    } else {
      setError(null)
      setStats(data as AdminDashboardStats)
    }
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { stats, loading, error, refresh }
}

export function useAdminOrders(limit = 200) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.rpc('get_admin_orders', { p_limit: limit } as { p_limit: number })
    setOrders((data as AdminOrder[]) ?? [])
    setLoading(false)
  }, [limit])

  useEffect(() => { refresh() }, [refresh])

  return { orders, loading, refresh }
}
