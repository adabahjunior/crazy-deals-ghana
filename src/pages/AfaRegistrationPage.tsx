import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'

export default function AfaRegistrationPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    idType: 'Ghana Card',
    idNumber: '',
    region: 'Greater Accra',
    network: 'MTN',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setMessage('')
    setLoading(true)

    const { error: insertError } = await supabase.from('afa_registrations').insert({
      user_id: user.id,
      full_name: form.fullName,
      phone: form.phone,
      id_type: form.idType,
      id_number: form.idNumber,
      region: form.region,
      network: form.network,
    })

    setLoading(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setMessage('AFA registration submitted successfully')
    setForm({ fullName: '', phone: '', idType: 'Ghana Card', idNumber: '', region: 'Greater Accra', network: 'MTN' })
  }

  return (
    <>
      <PageHeader
        title="AFA Registration"
        description="Register for AFA (Agent For Agent) program"
      />

      <div className="content-card">
        <h2>Registration Form</h2>
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {message && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input id="fullName" type="text" className="form-input" placeholder="Your full name" required
                value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input id="phone" type="tel" className="form-input" placeholder="0244123456" required
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="idType">ID Type</label>
              <select id="idType" className="form-input" value={form.idType}
                onChange={(e) => setForm({ ...form, idType: e.target.value })}>
                <option>Ghana Card</option>
                <option>Voter ID</option>
                <option>Passport</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="idNumber">ID Number</label>
              <input id="idNumber" type="text" className="form-input" placeholder="GHA-XXXXXXXXX-X" required
                value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="region">Region</label>
              <select id="region" className="form-input" value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}>
                <option>Greater Accra</option>
                <option>Ashanti</option>
                <option>Western</option>
                <option>Eastern</option>
                <option>Central</option>
                <option>Northern</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="network">Preferred Network</label>
              <select id="network" className="form-input" value={form.network}
                onChange={(e) => setForm({ ...form, network: e.target.value })}>
                <option>MTN</option>
                <option>AirtelTigo</option>
                <option>Telecel</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
