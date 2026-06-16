import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../hooks/useTransactions'

export default function WalletPage() {
  const { profile, refreshProfile } = useAuth()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Mobile Money (MTN)')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleTopUp = async () => {
    setError('')
    setMessage('')
    const value = parseFloat(amount)
    if (!value || value <= 0) {
      setError('Enter a valid amount')
      return
    }

    setLoading(true)
    const { error: rpcError } = await supabase.rpc('topup_wallet', {
      p_amount: value,
      p_method: method,
    } as { p_amount: number; p_method: string })
    setLoading(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setMessage(`Successfully added ${formatMoney(value)} to your wallet`)
    setAmount('')
    await refreshProfile()
  }

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Manage your wallet balance and top up funds"
      />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Available Balance</div>
          <div className="value accent">{formatMoney(profile?.wallet_balance ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Deposits</div>
          <div className="value">{formatMoney(profile?.total_deposits ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Spent</div>
          <div className="value">{formatMoney(profile?.total_spent ?? 0)}</div>
        </div>
      </div>

      <div className="content-card">
        <h2>Top Up Wallet</h2>
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {message && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#4ade80',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
          }}>
            {message}
          </div>
        )}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="amount">Amount (GHS)</label>
            <input
              id="amount"
              type="number"
              className="form-input"
              placeholder="Enter amount"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="method">Payment Method</label>
            <select
              id="method"
              className="form-input"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option>Mobile Money (MTN)</option>
              <option>Mobile Money (Telecel)</option>
              <option>Mobile Money (AirtelTigo)</option>
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleTopUp} disabled={loading}>
            {loading ? 'Processing...' : 'Proceed to Pay'}
          </button>
        </div>
      </div>
    </>
  )
}
