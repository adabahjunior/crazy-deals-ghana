import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useOwnWithdrawals } from '../hooks/useAgentTools'
import { formatDate, formatMoney } from '../hooks/useTransactions'

export default function StoreWithdrawalPage() {
  const { profile, refreshProfile, user } = useAuth()
  const { withdrawals, loading: historyLoading, refresh: refreshHistory } = useOwnWithdrawals(user?.id)
  const [amount, setAmount] = useState('')
  const [momoNumber, setMomoNumber] = useState('')
  const [momoNetwork, setMomoNetwork] = useState('MTN Mobile Money')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleWithdraw = async () => {
    setError('')
    setMessage('')
    const value = parseFloat(amount)
    if (!value || value < 10) {
      setError('Minimum withdrawal is GHS 10')
      return
    }
    if (!momoNumber.trim()) {
      setError('Enter your mobile money number')
      return
    }

    setLoading(true)
    const { error: rpcError } = await supabase.rpc('request_withdrawal', {
      p_amount: value,
      p_momo_number: momoNumber.trim(),
      p_momo_network: momoNetwork,
    } as { p_amount: number; p_momo_number: string; p_momo_network: string })
    setLoading(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setMessage('Withdrawal request submitted successfully')
    setAmount('')
    setMomoNumber('')
    await refreshProfile()
    await refreshHistory()
  }

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Withdrawals</h1>
          <p>Withdraw your store earnings to mobile money</p>
        </div>
      </div>

      <div className="dm-stats-grid dm-stats-grid-2">
        <div className="dm-stat-card">
          <span className="dm-stat-label">Available for Withdrawal</span>
          <div className="dm-stat-value accent">{formatMoney(profile?.store_balance ?? 0)}</div>
        </div>
        <div className="dm-stat-card">
          <span className="dm-stat-label">Total Withdrawn</span>
          <div className="dm-stat-value">{formatMoney(profile?.total_withdrawn ?? 0)}</div>
        </div>
      </div>

      <div className="content-card">
        <h2>Request Withdrawal</h2>
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {message && (
          <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{message}</div>
        )}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="withdrawAmount">Amount (GHS)</label>
            <input
              id="withdrawAmount"
              type="number"
              className="form-input"
              placeholder="Enter amount"
              min="10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="momoNumber">Mobile Money Number</label>
            <input
              id="momoNumber"
              type="tel"
              className="form-input"
              placeholder="0244123456"
              value={momoNumber}
              onChange={(e) => setMomoNumber(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="momoNetwork">Network</label>
            <select
              id="momoNetwork"
              className="form-input"
              value={momoNetwork}
              onChange={(e) => setMomoNetwork(e.target.value)}
            >
              <option>MTN Mobile Money</option>
              <option>Telecel Cash</option>
              <option>AirtelTigo Money</option>
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleWithdraw} disabled={loading}>
            {loading ? 'Submitting...' : 'Request Withdrawal'}
          </button>
        </div>
      </div>

      <div className="content-card">
        <h2>Withdrawal History</h2>
        {historyLoading ? (
          <p style={{ color: 'var(--dm-surface-400)' }}>Loading history...</p>
        ) : withdrawals.length === 0 ? (
          <div className="empty-state"><p>No withdrawals yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>MoMo</th>
                  <th>Network</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>{formatDate(w.created_at)}</td>
                    <td>{formatMoney(w.amount)}</td>
                    <td>{w.momo_number}</td>
                    <td>{w.momo_network}</td>
                    <td>
                      <span className={`status-badge ${w.status}`}>
                        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </span>
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
