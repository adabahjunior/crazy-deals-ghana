import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface SubAgentInfo {
  is_sub_agent: boolean
  parent_id?: string
  parent_name?: string
  parent_slug?: string
  commission_pct?: number
}

export function useSubAgentInfo() {
  const [info, setInfo] = useState<SubAgentInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.rpc('get_sub_agent_info')
    setInfo((data as SubAgentInfo) ?? { is_sub_agent: false })
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { info, loading, refresh }
}
