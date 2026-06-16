import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DataPackage, NetworkType } from '../types/database'
import { useAuth } from '../context/AuthContext'
import { mapPackagesWithPrice } from '../lib/pricing'

export function usePackages(network: NetworkType) {
  const { profile } = useAuth()
  const isAgent = !!profile?.store_published
  const [packages, setPackages] = useState<DataPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('data_packages')
        .select('*')
        .eq('network', network)
        .eq('is_active', true)
        .order('sort_order')

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setPackages([])
      } else {
        setError(null)
        setPackages(mapPackagesWithPrice(data ?? [], isAgent))
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [network, isAgent])

  return { packages, loading, error, isAgent }
}
