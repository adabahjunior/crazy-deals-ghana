import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  EmailCampaign,
  PromoCode,
  Profile,
  StoreOrder,
  SubAgentInvite,
  Withdrawal,
} from '../types/database'

export function usePromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
    setCodes(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { codes, loading, refresh }
}

export function useSubAgentInvites() {
  const [invites, setInvites] = useState<SubAgentInvite[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sub_agent_invites')
      .select('*')
      .order('created_at', { ascending: false })
    setInvites(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { invites, loading, refresh }
}

export function useSubAgents(parentId: string | undefined) {
  const [subAgents, setSubAgents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!parentId) {
      setSubAgents([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_agent_id', parentId)
      .order('created_at', { ascending: false })
    setSubAgents(data ?? [])
    setLoading(false)
  }, [parentId])

  useEffect(() => { refresh() }, [refresh])

  return { subAgents, loading, refresh }
}

export function useSubAgentOrders(subAgentIds: string[]) {
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (subAgentIds.length === 0) {
      setOrders([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('store_orders')
      .select('*')
      .in('store_user_id', subAgentIds)
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }, [subAgentIds.join(',')])

  useEffect(() => { refresh() }, [refresh])

  return { orders, loading, refresh }
}

export function useSubAgentWithdrawals(subAgentIds: string[]) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (subAgentIds.length === 0) {
      setWithdrawals([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .in('user_id', subAgentIds)
      .order('created_at', { ascending: false })
    setWithdrawals(data ?? [])
    setLoading(false)
  }, [subAgentIds.join(',')])

  useEffect(() => { refresh() }, [refresh])

  return { withdrawals, loading, refresh }
}

export function useEmailCampaigns() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    setCampaigns(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { campaigns, loading, refresh }
}

export function useOwnWithdrawals(userId: string | undefined) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setWithdrawals(data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh])

  return { withdrawals, loading, refresh }
}
