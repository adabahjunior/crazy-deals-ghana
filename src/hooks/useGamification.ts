import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface GamificationStatus {
  points_balance: number
  referral_code: string
  bonus_spin_chances: number
  can_spin: boolean
  days_until_spin: number
  last_spin_at: string | null
  referral_points: number
  redemption_threshold: number
  spin_interval_days: number
}

export interface SpinResult {
  spin_id: string
  prize_type: 'points' | 'data'
  prize_label: string
  points_awarded?: number
  data_gb?: number
  requires_phone?: boolean
  segment_index: number
}

export interface PointTransaction {
  id: string
  amount: number
  type: string
  description: string | null
  created_at: string
}

export interface SpinHistoryItem {
  id: string
  prize_type: string
  prize_label: string
  points_awarded: number
  data_gb: number | null
  phone: string | null
  claimed: boolean
  created_at: string
}

export interface ReferralItem {
  id: string
  referred_user_id: string
  points_awarded: number
  created_at: string
}

export function useGamification() {
  const [status, setStatus] = useState<GamificationStatus | null>(null)
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([])
  const [spinHistory, setSpinHistory] = useState<SpinHistoryItem[]>([])
  const [referrals, setReferrals] = useState<ReferralItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    const [statusRes, pointsRes, spinsRes, refsRes] = await Promise.all([
      supabase.rpc('get_gamification_status'),
      supabase
        .from('point_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('spin_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (statusRes.error) {
      setError(statusRes.error.message)
      setStatus(null)
    } else {
      setStatus(statusRes.data as GamificationStatus)
    }

    setPointHistory((pointsRes.data ?? []) as PointTransaction[])
    setSpinHistory((spinsRes.data ?? []) as SpinHistoryItem[])
    setReferrals((refsRes.data ?? []) as ReferralItem[])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const spin = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('perform_spin')
    if (rpcError) return { error: rpcError.message, result: null as SpinResult | null }
    await refresh()
    return { error: null, result: data as SpinResult }
  }, [refresh])

  const claimDataPrize = useCallback(async (spinId: string, phone: string) => {
    const { data, error: rpcError } = await supabase.rpc('claim_spin_data_prize', {
      p_spin_id: spinId,
      p_phone: phone,
    })
    if (rpcError) return { error: rpcError.message, transactionId: null as string | null }
    await refresh()
    return { error: null, transactionId: data as string }
  }, [refresh])

  const redeemPoints = useCallback(async (network: string, phone: string) => {
    const { data, error: rpcError } = await supabase.rpc('redeem_points_for_data', {
      p_network: network,
      p_phone: phone,
    })
    if (rpcError) return { error: rpcError.message, transactionId: null as string | null }
    await refresh()
    return { error: null, transactionId: data as string }
  }, [refresh])

  return {
    status,
    pointHistory,
    spinHistory,
    referrals,
    loading,
    error,
    refresh,
    spin,
    claimDataPrize,
    redeemPoints,
  }
}
