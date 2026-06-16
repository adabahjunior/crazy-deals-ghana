import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import { API_BASE_URL, API_DOCS_URL, API_ENDPOINTS } from '../lib/apiConfig'

export default function DeveloperApiPage() {
  const { profile, refreshProfile } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [testResult, setTestResult] = useState('')

  useEffect(() => {
    if (profile?.api_key) setApiKey(profile.api_key)
  }, [profile?.api_key])

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey || profile?.api_key || '')
    setMessage('API key copied to clipboard')
    setTimeout(() => setMessage(''), 2000)
  }

  const handleRegenerate = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('regenerate_api_key')
    setLoading(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setApiKey(data)
    setMessage('API key regenerated')
    await refreshProfile()
  }

  const testConnection = async () => {
    setTestResult('Testing...')
    const key = apiKey || profile?.api_key
    if (!key) {
      setTestResult('No API key available')
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.balance}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      const data = await res.json()
      if (data.success) {
        setTestResult(`Connected! Wallet: GHS ${Number(data.wallet_balance).toFixed(2)} (${data.account_type})`)
      } else {
        setTestResult(`Error: ${data.error ?? 'Unknown error'}`)
      }
    } catch {
      setTestResult('Connection failed — ensure API rewrites are configured on crazydealsgh.shop')
    }
  }

  const displayKey = apiKey || profile?.api_key || 'Loading...'

  return (
    <>
      <PageHeader
        title="Developer API"
        description="Integrate CrazyDeals data services into your application"
      />

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Full documentation: <Link to="/api-docs" style={{ color: 'var(--accent)' }}>{API_DOCS_URL}</Link>
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Base URL: <code>{API_BASE_URL}</code>
        </p>
      </div>

      <div className="content-card">
        <h2>API Key</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>
          Use this key in the <code>Authorization: Bearer</code> header. Keep it secret.
        </p>
        {message && <p style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}>{message}</p>}
        <div className="api-key-box">{displayKey}</div>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={handleCopy}>Copy Key</button>
          <button className="btn btn-primary" onClick={handleRegenerate} disabled={loading}>
            {loading ? 'Regenerating...' : 'Regenerate Key'}
          </button>
          <button className="btn btn-secondary" onClick={testConnection}>Test Connection</button>
        </div>
        {testResult && <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>{testResult}</p>}
      </div>

      <div className="content-card">
        <h2>Endpoints</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>GET</td>
              <td>{API_BASE_URL}{API_ENDPOINTS.packages}</td>
              <td>List available data packages with your prices</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>{API_BASE_URL}{API_ENDPOINTS.balance}</td>
              <td>Check wallet balance</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>{API_BASE_URL}{API_ENDPOINTS.transactions}</td>
              <td>List recent transactions</td>
            </tr>
            <tr>
              <td>GET</td>
              <td>{API_BASE_URL}/transactions/:id</td>
              <td>Get transaction status</td>
            </tr>
            <tr>
              <td>POST</td>
              <td>{API_BASE_URL}{API_ENDPOINTS.purchase}</td>
              <td>Purchase and deliver data bundle</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="content-card">
        <h2>Quick Start</h2>
        <pre className="api-key-box" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{`curl "${API_BASE_URL}/packages" \\
  -H "Authorization: Bearer ${displayKey === 'Loading...' ? 'cd_gh_YOUR_KEY' : displayKey}"`}</pre>
      </div>
    </>
  )
}
