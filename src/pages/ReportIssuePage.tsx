import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'

export default function ReportIssuePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    issueType: 'Failed Transaction',
    transactionRef: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setMessage('')
    setLoading(true)

    const { error: insertError } = await supabase.from('issue_reports').insert({
      user_id: user.id,
      issue_type: form.issueType,
      transaction_ref: form.transactionRef || null,
      description: form.description,
    })

    setLoading(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setMessage('Issue reported successfully. Our team will review it shortly.')
    setForm({ issueType: 'Failed Transaction', transactionRef: '', description: '' })
  }

  return (
    <>
      <PageHeader
        title="Report an Issue"
        description="Let us know about any problems you're experiencing"
      />

      <div className="content-card">
        <h2>Submit a Report</h2>
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="issueType">Issue Type</label>
              <select id="issueType" className="form-input" value={form.issueType}
                onChange={(e) => setForm({ ...form, issueType: e.target.value })}>
                <option>Failed Transaction</option>
                <option>Delayed Data Delivery</option>
                <option>Wallet Issue</option>
                <option>Store Problem</option>
                <option>API Issue</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="transactionId">Transaction ID (if applicable)</label>
              <input id="transactionId" type="text" className="form-input" placeholder="e.g. TXN001"
                value={form.transactionRef} onChange={(e) => setForm({ ...form, transactionRef: e.target.value })} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1.25rem' }}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="form-input"
              rows={5}
              placeholder="Describe the issue in detail..."
              style={{ resize: 'vertical' }}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
