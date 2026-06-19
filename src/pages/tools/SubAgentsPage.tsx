import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useSubAgentInvites, useSubAgents } from '../../hooks/useAgentTools'
import { copyToClipboard, getStoreUrl } from '../../lib/storeUtils'
import { formatDate, formatMoney } from '../../hooks/useTransactions'

export default function SubAgentsPage() {
  const { user } = useAuth()
  const { invites, loading: invitesLoading, refresh: refreshInvites } = useSubAgentInvites()
  const { subAgents, loading: agentsLoading, refresh: refreshAgents } = useSubAgents(user?.id)
  const [label, setLabel] = useState('')
  const [commission, setCommission] = useState('10')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState('')

  const createInvite = async () => {
    setError('')
    setMessage('')
    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('create_sub_agent_invite', {
      p_label: label.trim() || null,
      p_commission_pct: parseFloat(commission) || 10,
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage(`Invite created: ${(data as { invite_code: string }).invite_code}`)
    setLabel('')
    await refreshInvites()
  }

  const revokeInvite = async (id: string) => {
    const { error: rpcError } = await supabase.rpc('revoke_sub_agent_invite', { p_invite_id: id })
    if (rpcError) setError(rpcError.message)
    else await refreshInvites()
  }

  const removeAgent = async (id: string) => {
    if (!confirm('Remove this sub-agent from your team?')) return
    const { error: rpcError } = await supabase.rpc('remove_sub_agent', { p_sub_agent_id: id })
    if (rpcError) setError(rpcError.message)
    else await refreshAgents()
  }

  const syncCatalog = async (subAgentId: string) => {
    setError('')
    setMessage('')
    const { data, error: rpcError } = await supabase.rpc('sync_store_packages_from_parent', {
      p_sub_agent_id: subAgentId,
    })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage(`Synced ${data ?? 0} package(s) to sub-agent catalog`)
  }

  const updateCommission = async (id: string, pct: number) => {
    const { error: rpcError } = await supabase.rpc('update_sub_agent_commission', {
      p_sub_agent_id: id,
      p_commission_pct: pct,
    })
    if (rpcError) setError(rpcError.message)
    else await refreshAgents()
  }

  const copyInvite = async (code: string) => {
    const url = `${window.location.origin}/auth/register?invite=${code}`
    await copyToClipboard(url)
    setCopied(code)
    window.setTimeout(() => setCopied(''), 2000)
  }

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Sub-Agents</h1>
          <p>Recruit and manage sub-agents under your store</p>
        </div>
      </div>

      <div className="dm-stats-grid dm-stats-grid-2">
        <div className="dm-stat-card">
          <span className="dm-stat-label">Active Sub-Agents</span>
          <div className="dm-stat-value accent">{subAgents.length}</div>
        </div>
        <div className="dm-stat-card">
          <span className="dm-stat-label">Active Invites</span>
          <div className="dm-stat-value">{invites.filter((i) => i.status === 'active').length}</div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1rem' }}>
        <h2>Create Invite Link</h2>
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{message}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="inviteLabel">Label (optional)</label>
            <input id="inviteLabel" className="form-input" placeholder="e.g. Accra Team" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="inviteCommission">Commission %</label>
            <input id="inviteCommission" type="number" min="0" max="100" className="form-input" value={commission} onChange={(e) => setCommission(e.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={createInvite} disabled={busy}>
            {busy ? 'Creating...' : 'Generate Invite'}
          </button>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1rem' }}>
        <h2>Invite Links</h2>
        {invitesLoading ? (
          <p style={{ color: 'var(--dm-surface-400)' }}>Loading...</p>
        ) : invites.length === 0 ? (
          <div className="empty-state"><p>No invites yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Label</th>
                  <th>Commission</th>
                  <th>Uses</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td><code>{invite.invite_code}</code></td>
                    <td>{invite.label ?? '—'}</td>
                    <td>{invite.commission_pct}%</td>
                    <td>{invite.uses_count}</td>
                    <td>
                      <span className={`status-badge ${invite.status === 'active' ? 'success' : 'failed'}`}>
                        {invite.status}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => copyInvite(invite.invite_code)}>
                        {copied === invite.invite_code ? 'Copied!' : 'Copy Link'}
                      </button>
                      {invite.status === 'active' && (
                        <button type="button" className="btn btn-ghost" onClick={() => revokeInvite(invite.id)}>
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="content-card">
        <h2>Your Sub-Agents</h2>
        {agentsLoading ? (
          <p style={{ color: 'var(--dm-surface-400)' }}>Loading...</p>
        ) : subAgents.length === 0 ? (
          <div className="empty-state"><p>No sub-agents joined yet. Share an invite link to recruit agents.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Store</th>
                  <th>Balance</th>
                  <th>Commission</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subAgents.map((agent) => (
                  <tr key={agent.id}>
                    <td>{agent.full_name ?? agent.email ?? '—'}</td>
                    <td>
                      {agent.store_slug ? (
                        <a href={getStoreUrl(agent.store_slug)} target="_blank" rel="noopener noreferrer">
                          {agent.store_name ?? agent.store_slug}
                        </a>
                      ) : '—'}
                    </td>
                    <td>{formatMoney(agent.store_balance)}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-input"
                        style={{ width: '5rem' }}
                        defaultValue={agent.sub_agent_commission_pct}
                        onBlur={(e) => updateCommission(agent.id, parseFloat(e.target.value) || 0)}
                      />
                      %
                    </td>
                    <td>{formatDate(agent.created_at)}</td>
                    <td>
                      <button type="button" className="btn btn-ghost" onClick={() => syncCatalog(agent.id)}>
                        Sync Catalog
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => removeAgent(agent.id)}>
                        Remove
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
