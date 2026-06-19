import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useEmailCampaigns } from '../../hooks/useAgentTools'
import { formatDate } from '../../hooks/useTransactions'
import type { AgentSettings } from '../../types/database'

export default function EmailMarketingPage() {
  const { profile, refreshProfile } = useAuth()
  const { campaigns, loading, refresh } = useEmailCampaigns()
  const settings = (profile?.agent_settings ?? {}) as AgentSettings
  const email = settings.email ?? {}

  const [host, setHost] = useState('')
  const [port, setPort] = useState('587')
  const [user, setUser] = useState('')
  const [fromName, setFromName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [recipientCount, setRecipientCount] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setHost(email.host ?? '')
    setPort(email.port ?? '587')
    setUser(email.user ?? '')
    setFromName(email.from_name ?? profile?.store_name ?? '')
    setFromEmail(email.from_email ?? profile?.email ?? '')
  }, [profile])

  const saveSmtp = async () => {
    setError('')
    setMessage('')
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('update_agent_settings', {
      p_settings: {
        email: {
          host: host.trim(),
          port: port.trim(),
          user: user.trim(),
          from_name: fromName.trim(),
          from_email: fromEmail.trim(),
        },
      },
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage('SMTP settings saved')
    await refreshProfile()
  }

  const createCampaign = async () => {
    setError('')
    setMessage('')
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('create_email_campaign', {
      p_subject: subject,
      p_body: body,
      p_recipient_count: parseInt(recipientCount, 10) || 0,
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage('Campaign saved as draft')
    setSubject('')
    setBody('')
    await refresh()
  }

  const sendCampaign = async (id: string) => {
    setError('')
    const { error: rpcError } = await supabase.rpc('send_email_campaign', { p_campaign_id: id })
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage('Campaign marked as sent')
    await refresh()
  }

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Email Marketing</h1>
          <p>Compose campaigns and manage SMTP settings</p>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1rem' }}>
        <h2>SMTP Settings</h2>
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{message}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="smtpHost">SMTP Host</label>
            <input id="smtpHost" className="form-input" placeholder="smtp.gmail.com" value={host} onChange={(e) => setHost(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="smtpPort">Port</label>
            <input id="smtpPort" className="form-input" value={port} onChange={(e) => setPort(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="smtpUser">Username</label>
            <input id="smtpUser" className="form-input" value={user} onChange={(e) => setUser(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="fromName">From Name</label>
            <input id="fromName" className="form-input" value={fromName} onChange={(e) => setFromName(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="fromEmail">From Email</label>
            <input id="fromEmail" type="email" className="form-input" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={saveSmtp} disabled={busy}>
            Save SMTP
          </button>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1rem' }}>
        <h2>New Campaign</h2>
        <div className="form-group">
          <label htmlFor="campaignSubject">Subject</label>
          <input id="campaignSubject" className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="campaignBody">Message</label>
          <textarea id="campaignBody" className="form-input" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="recipientCount">Estimated recipients</label>
          <input id="recipientCount" type="number" min="0" className="form-input" value={recipientCount} onChange={(e) => setRecipientCount(e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={createCampaign} disabled={busy}>
            Save Draft
          </button>
        </div>
      </div>

      <div className="content-card">
        <h2>Campaigns</h2>
        {loading ? (
          <p style={{ color: 'var(--dm-surface-400)' }}>Loading...</p>
        ) : campaigns.length === 0 ? (
          <div className="empty-state"><p>No campaigns yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Recipients</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>{c.subject}</td>
                    <td>{c.recipient_count}</td>
                    <td>
                      <span className={`status-badge ${c.status === 'sent' ? 'success' : c.status === 'failed' ? 'failed' : 'pending'}`}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td>{formatDate(c.created_at)}</td>
                    <td>
                      {c.status === 'draft' && (
                        <button type="button" className="btn btn-ghost" onClick={() => sendCampaign(c.id)}>
                          Send
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
    </>
  )
}
