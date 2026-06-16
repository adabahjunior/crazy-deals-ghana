import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import { formatMoney } from '../../hooks/useTransactions'

interface SiteSetting {
  key: string
  value: string
  label: string | null
}

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<SiteSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('site_settings').select('*').order('key').then(({ data }) => {
      setSettings(data ?? [])
      setLoading(false)
    })
  }, [])

  const getSetting = (key: string) => settings.find((s) => s.key === key)?.value ?? ''

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
  }

  const handleSave = async () => {
    setError('')
    setMessage('')
    if (!user) return

    for (const setting of settings) {
      const { error: updateError } = await supabase
        .from('site_settings')
        .update({
          value: setting.value,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('key', setting.key)

      if (updateError) {
        setError(updateError.message)
        return
      }
    }

    setMessage('Site settings saved successfully')
  }

  const storeActivationEnabled = getSetting('store_activation_enabled') === 'true'
  const swiftdataKeys = ['swiftdata_enabled', 'swiftdata_api_key', 'swiftdata_api_url']
  const generalSettings = settings.filter(
    (s) => !['store_activation_enabled', 'store_activation_cost', ...swiftdataKeys].includes(s.key)
  )

  return (
    <>
      <PageHeader title="Site Settings" description="Configure global site options" />

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Store Activation Fee</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
          When enabled, users must pay a fee from their wallet before they can create a store and become an <strong>Agent</strong>.
          When disabled, store creation is free.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label>Require Activation Fee</label>
            <select
              className="form-input"
              value={getSetting('store_activation_enabled')}
              onChange={(e) => handleChange('store_activation_enabled', e.target.value)}
            >
              <option value="false">Off — Free store creation</option>
              <option value="true">On — Users must pay to become Agents</option>
            </select>
          </div>
          {storeActivationEnabled && (
            <div className="form-group">
              <label>Activation Cost (GHS)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={getSetting('store_activation_cost')}
                onChange={(e) => handleChange('store_activation_cost', e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
          )}
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>SwiftData GH Integration</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
          Successful data purchases are sent to SwiftData GH for delivery. Orders use your SwiftData API wallet.
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label>SwiftData Fulfillment</label>
            <select
              className="form-input"
              value={getSetting('swiftdata_enabled')}
              onChange={(e) => handleChange('swiftdata_enabled', e.target.value)}
            >
              <option value="true">On — Send orders to SwiftData API</option>
              <option value="false">Off — Manual fulfillment</option>
            </select>
          </div>
          <div className="form-group">
            <label>SwiftData API Key</label>
            <input
              type="password"
              className="form-input"
              value={getSetting('swiftdata_api_key')}
              onChange={(e) => handleChange('swiftdata_api_key', e.target.value)}
              placeholder="swft_live_..."
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label>SwiftData Buy URL</label>
            <input
              type="text"
              className="form-input"
              value={getSetting('swiftdata_api_url')}
              onChange={(e) => handleChange('swiftdata_api_url', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="content-card">
        <h2>General Settings</h2>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : (
          <>
            {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
            {message && <div className="admin-success" style={{ marginBottom: '1rem' }}>{message}</div>}

            <div className="form-grid">
              {generalSettings.map((setting) => (
                <div className="form-group" key={setting.key}>
                  <label>{setting.label ?? setting.key}</label>
                  {setting.key === 'maintenance_mode' ? (
                    <select
                      className="form-input"
                      value={setting.value}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                    >
                      <option value="false">Off</option>
                      <option value="true">On</option>
                    </select>
                  ) : setting.key === 'announcement_banner' ? (
                    <textarea
                      className="form-input"
                      rows={3}
                      value={setting.value}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                    />
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      value={setting.value}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSave}>Save Settings</button>
            </div>
          </>
        )}
      </div>

      {storeActivationEnabled && (
        <div className="content-card" style={{ marginTop: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Current activation fee: <strong>{formatMoney(parseFloat(getSetting('store_activation_cost') || '0'))}</strong>
          </p>
        </div>
      )}
    </>
  )
}
