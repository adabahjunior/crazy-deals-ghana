import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSubAgents, useSubAgentWithdrawals } from '../../hooks/useAgentTools'
import { supabase } from '../../lib/supabase'
import { formatDate, formatMoney } from '../../hooks/useTransactions'

export default function SubAgentWithdrawalsPage() {
  const { user } = useAuth()
  const { subAgents, loading: agentsLoading } = useSubAgents(user?.id)
  const subAgentIds = useMemo(() => subAgents.map((a) => a.id), [subAgents])
  const { withdrawals, loading: withdrawalsLoading, refresh } = useSubAgentWithdrawals(subAgentIds)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const approveWithdrawal = async (id: string) => {
    setError('')
    const { error: rpcError } = await supabase.rpc('parent_approve_sub_agent_withdrawal', {
      p_withdrawal_id: id,
    })
    if (rpcError) setError(rpcError.message)
    else {
      setMessage('Withdrawal approved — admin will process payment')
      await refresh()
    }
  }

  const agentMap = useMemo(() => new Map(subAgents.map((a) => [a.id, a])), [subAgents])
  const pendingTotal = withdrawals.filter((w) => w.status === 'pending').reduce((s, w) => s + Number(w.amount), 0)

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Agent Withdrawals</h1>
          <p>Review withdrawal requests from your sub-agents</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={refresh}>Refresh</button>
      </div>

      <div className="dm-stats-grid dm-stats-grid-2">
        <div className="dm-stat-card">
          <span className="dm-stat-label">Total Requests</span>
          <div className="dm-stat-value">{withdrawals.length}</div>
        </div>
        <div className="dm-stat-card">
          <span className="dm-stat-label">Pending Amount</span>
          <div className="dm-stat-value accent">{formatMoney(pendingTotal)}</div>
        </div>
      </div>

      <div className="content-card">
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{message}</div>}
        {agentsLoading || withdrawalsLoading ? (
          <p style={{ color: 'var(--dm-surface-400)' }}>Loading...</p>
        ) : subAgents.length === 0 ? (
          <div className="empty-state"><p>No sub-agents yet.</p></div>
        ) : withdrawals.length === 0 ? (
          <div className="empty-state"><p>No sub-agent withdrawal requests yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sub-Agent</th>
                  <th>Amount</th>
                  <th>MoMo Number</th>
                  <th>Network</th>
                  <th>Status</th>
                  <th>Parent OK</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => {
                  const agent = agentMap.get(w.user_id)
                  return (
                    <tr key={w.id}>
                      <td>{formatDate(w.created_at)}</td>
                      <td>{agent?.full_name ?? agent?.email ?? '—'}</td>
                      <td>{formatMoney(w.amount)}</td>
                      <td>{w.momo_number}</td>
                      <td>{w.momo_network}</td>
                      <td>
                        <span className={`status-badge ${w.status}`}>
                          {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${w.parent_approved ? 'success' : 'pending'}`}>
                          {w.parent_approved ? 'Yes' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {w.status === 'pending' && !w.parent_approved && (
                          <button type="button" className="btn btn-ghost" onClick={() => approveWithdrawal(w.id)}>
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
