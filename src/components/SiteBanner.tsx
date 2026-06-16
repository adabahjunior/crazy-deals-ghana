import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SiteBanner() {
  const [banner, setBanner] = useState('')
  const [maintenance, setMaintenance] = useState(false)

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['announcement_banner', 'maintenance_mode'])
      .then(({ data }) => {
        const map = Object.fromEntries((data ?? []).map((s) => [s.key, s.value]))
        setBanner(map.announcement_banner ?? '')
        setMaintenance(map.maintenance_mode === 'true')
      })
  }, [])

  if (maintenance) {
    return (
      <div className="site-banner site-banner-warning">
        Site is under maintenance. Some features may be unavailable.
      </div>
    )
  }

  if (!banner.trim()) return null

  return <div className="site-banner">{banner}</div>
}
