import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import { formatDate, formatMoney } from '../../hooks/useTransactions'
import type { Withdrawal } from '../../types/database'

interface WithdrawalRow extends Withdrawal {
  user_name: string | null
  user_email: string | null
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('all')

  const load = async () => {
    setLoading(true)
    const { data: rows, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email')
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

    setWithdrawals(
      (rows ?? []).map((w) => ({
        ...w,
        user_name: profileMap.get(w.user_id)?.full_name ?? null,
        user_email: profileMap.get(w.user_id)?.email ?? null,
      }))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id: string, status: 'success' | 'failed') => {
    setError('')
    setMessage('')
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({ status })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setMessage(`Withdrawal marked as ${status}`)
    await load()
  }

  const filtered = withdrawals.filter((w) => filter === 'all' || w.status === filter)
  const pendingTotal = withdrawals.filter((w) => w.status === 'pending').reduce((s, w) => s + Number(w.amount), 0)

  return (
    <>
      <PageHeader title="Withdrawals" description="Review and process agent withdrawal requests" />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Requests</div>
          <div className="value">{withdrawals.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Pending</div>
          <div className="value accent">{formatMoney(pendingTotal)}</div>
        </div>
      </div>

      <div className="content-card">
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{message}</div>}

        <div className="dm-filter-tabs">
          {(['all', 'pending', 'success', 'failed'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`dm-filter-tab ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No withdrawals found.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Amount</th>
                  <th>MoMo</th>
                  <th>Network</th>
                  <th>Status</th>
                  <th>Parent OK</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr key={w.id}>
                    <td>{formatDate(w.created_at)}</td>
                    <td>{w.user_name ?? w.user_email ?? w.user_id.slice(0, 8)}</td>
                    <td>{formatMoney(w.amount)}</td>
                    <td>{w.momo_number}</td>
                    <td>{w.momo_network}</td>
                    <td>
                      <span className={`status-badge ${w.status}`}>
                        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {w.parent_agent_id ? (
                        <span className={`status-badge ${w.parent_approved ? 'success' : 'pending'}`}>
                          {w.parent_approved ? 'Approved' : 'Awaiting'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {w.status === 'pending' && (
                        <>
                          {(!w.parent_agent_id || w.parent_approved) && (
                            <button type="button" className="btn btn-ghost" onClick={() => updateStatus(w.id, 'success')}>
                              Approve
                            </button>
                          )}
                          <button type="button" className="btn btn-ghost" onClick={() => updateStatus(w.id, 'failed')}>
                            Reject
                          </button>
                        </>
                      )}
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
