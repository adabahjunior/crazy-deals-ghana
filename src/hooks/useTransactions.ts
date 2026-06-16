import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../types/database'
import { useAuth } from '../context/AuthContext'

export function useTransactions(limit?: number) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (limit) query = query.limit(limit)

    const { data } = await query
    setTransactions(data ?? [])
    setLoading(false)
  }, [user, limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { transactions, loading, refresh }
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatMoney(amount: number) {
  return `GHS ${Number(amount).toFixed(2)}`
}
