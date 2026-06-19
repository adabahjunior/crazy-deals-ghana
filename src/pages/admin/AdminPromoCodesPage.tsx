import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import { formatDate } from '../../hooks/useTransactions'
import { networkLabels, type NetworkType, type PromoCode } from '../../types/database'

interface PromoRow extends PromoCode {
  agent_name: string | null
}

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState<PromoRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: rows } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: profiles } = await supabase.from('profiles').select('id, full_name, store_name')
      const map = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? p.store_name]))

      setCodes((rows ?? []).map((c) => ({ ...c, agent_name: map.get(c.agent_id) ?? null })))
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader title="Promo Codes" description="All agent-generated promo codes across the platform" />

      <div className="content-card">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : codes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No promo codes yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Code</th>
                  <th>Package</th>
                  <th>Uses</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id}>
                    <td>{code.agent_name ?? '—'}</td>
                    <td><code>{code.code}</code></td>
                    <td>{networkLabels[code.network as NetworkType] ?? code.network} {code.size_gb}GB</td>
                    <td>{code.redemption_count}/{code.max_redemptions}</td>
                    <td>
                      <span className={`status-badge ${code.is_active ? 'success' : 'failed'}`}>
                        {code.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>{formatDate(code.created_at)}</td>
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
