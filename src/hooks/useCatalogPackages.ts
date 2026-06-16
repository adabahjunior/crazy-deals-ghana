import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DataPackage } from '../types/database'
import { sortByNetworkAndSize } from '../lib/networkOrder'

export function useCatalogPackages() {
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
        .eq('is_active', true)
        .order('network')
        .order('sort_order')

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
        setPackages([])
      } else {
        setError(null)
        setPackages(sortByNetworkAndSize(data ?? []))
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { packages, loading, error }
}
