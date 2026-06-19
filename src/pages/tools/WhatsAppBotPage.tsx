import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { AgentSettings } from '../../types/database'
import { getStoreUrl } from '../../lib/storeUtils'

export default function WhatsAppBotPage() {
  const { profile, refreshProfile } = useAuth()
  const settings = (profile?.agent_settings ?? {}) as AgentSettings
  const whatsapp = settings.whatsapp ?? {}

  const [enabled, setEnabled] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [autoReply, setAutoReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setEnabled(!!whatsapp.enabled)
    setGreeting(whatsapp.greeting ?? `Hi! Welcome to ${profile?.store_name ?? 'our store'}. Reply with your phone number to buy data.`)
    setAutoReply(whatsapp.auto_reply ?? 'Thanks! We received your message and will process your order shortly.')
  }, [profile])

  const save = async () => {
    setError('')
    setMessage('')
    setBusy(true)
    const { error: rpcError } = await supabase.rpc('update_agent_settings', {
      p_settings: {
        whatsapp: { enabled, greeting: greeting.trim(), auto_reply: autoReply.trim() },
      },
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setMessage('WhatsApp bot settings saved')
    await refreshProfile()
  }

  const storeUrl = profile?.store_slug ? getStoreUrl(profile.store_slug) : ''
  const waLink = profile?.store_whatsapp
    ? `https://wa.me/233${profile.store_whatsapp.replace(/^0/, '')}?text=${encodeURIComponent(greeting)}`
    : ''

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>WhatsApp Bot <span className="dm-nav-badge">BETA</span></h1>
          <p>Automate customer orders through WhatsApp</p>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1rem' }}>
        <h2>Bot Status</h2>
        <div className="dm-settings-row">
          <div>
            <strong>{enabled ? 'Bot Enabled' : 'Bot Disabled'}</strong>
            <p style={{ color: 'var(--dm-surface-500)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {profile?.store_whatsapp ? `Linked number: ${profile.store_whatsapp}` : 'Set your WhatsApp number in Store Settings first'}
            </p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1rem' }}>
        <h2>Messages</h2>
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{message}</div>}
        <div className="form-group">
          <label htmlFor="waGreeting">Welcome greeting</label>
          <textarea id="waGreeting" className="form-input" rows={3} value={greeting} onChange={(e) => setGreeting(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="waAutoReply">Auto-reply message</label>
          <textarea id="waAutoReply" className="form-input" rows={3} value={autoReply} onChange={(e) => setAutoReply(e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="content-card">
        <h2>Quick Links</h2>
        <p style={{ color: 'var(--dm-surface-400)', marginBottom: '1rem' }}>
          Share your store link on WhatsApp so customers can browse and order.
        </p>
        <div className="dm-quick-actions">
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Open WhatsApp Chat
            </a>
          )}
          {storeUrl && (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              View Store
            </a>
          )}
        </div>
      </div>
    </>
  )
}
