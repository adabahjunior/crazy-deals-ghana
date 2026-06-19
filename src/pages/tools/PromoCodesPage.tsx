import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePromoCodes } from '../../hooks/useAgentTools'
import { formatDate } from '../../hooks/useTransactions'
import { networkLabels, type NetworkType } from '../../types/database'

export default function PromoCodesPage() {
  const { codes, loading, refresh } = usePromoCodes()
  const [count, setCount] = useState('5')
  const [network, setNetwork] = useState<NetworkType>('mtn')
  const [sizeGb, setSizeGb] = useState('1')
  const [maxUses, setMaxUses] = useState('1')
  const [prefix, setPrefix] = useState('CD')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const generate = async () => {
    setError('')
    setMessage('')
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('create_promo_codes', {
      p_count: parseInt(count, 10) || 1,
      p_network: network,
      p_size_gb: parseFloat(sizeGb) || 1,
      p_prefix: prefix.trim() || 'CD',
      p_max_redemptions: parseInt(maxUses, 10) || 1,
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage(`Generated ${count} promo code(s) successfully`)
    await refresh()
  }

  const toggleCode = async (id: string, active: boolean) => {
    const { error: rpcError } = await supabase.rpc('toggle_promo_code', {
      p_code_id: id,
      p_active: active,
    })
    if (rpcError) setError(rpcError.message)
    else await refresh()
  }

  const activeCount = codes.filter((c) => c.is_active).length
  const redeemedTotal = codes.reduce((s, c) => s + c.redemption_count, 0)

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Promo Codes <span className="dm-nav-badge">NEW</span></h1>
          <p>Generate free data promo code batches for your customers</p>
        </div>
      </div>

      <div className="dm-stats-grid dm-stats-grid-3">
        <div className="dm-stat-card">
          <span className="dm-stat-label">Total Codes</span>
          <div className="dm-stat-value">{codes.length}</div>
        </div>
        <div className="dm-stat-card">
          <span className="dm-stat-label">Active</span>
          <div className="dm-stat-value accent">{activeCount}</div>
        </div>
        <div className="dm-stat-card">
          <span className="dm-stat-label">Redemptions</span>
          <div className="dm-stat-value">{redeemedTotal}</div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1rem' }}>
        <h2>Generate Batch</h2>
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{message}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="promoCount">Number of codes</label>
            <input id="promoCount" type="number" min="1" max="100" className="form-input" value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="promoNetwork">Network</label>
            <select id="promoNetwork" className="form-input" value={network} onChange={(e) => setNetwork(e.target.value as NetworkType)}>
              {Object.entries(networkLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="promoSize">Data size (GB)</label>
            <input id="promoSize" type="number" min="0.1" step="0.1" className="form-input" value={sizeGb} onChange={(e) => setSizeGb(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="promoMaxUses">Max uses per code</label>
            <input id="promoMaxUses" type="number" min="1" className="form-input" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="promoPrefix">Code prefix</label>
            <input id="promoPrefix" type="text" className="form-input" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={generate} disabled={busy}>
            {busy ? 'Generating...' : 'Generate Codes'}
          </button>
        </div>
      </div>

      <div className="content-card">
        <h2>Your Promo Codes</h2>
        {loading ? (
          <p style={{ color: 'var(--dm-surface-400)' }}>Loading...</p>
        ) : codes.length === 0 ? (
          <div className="empty-state"><p>No promo codes yet. Generate your first batch above.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Package</th>
                  <th>Uses</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id}>
                    <td><code>{code.code}</code></td>
                    <td>{networkLabels[code.network as NetworkType] ?? code.network} {code.size_gb}GB</td>
                    <td>{code.redemption_count}/{code.max_redemptions}</td>
                    <td>
                      <span className={`status-badge ${code.is_active ? 'success' : 'failed'}`}>
                        {code.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>{formatDate(code.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => toggleCode(code.id, !code.is_active)}
                      >
                        {code.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
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
