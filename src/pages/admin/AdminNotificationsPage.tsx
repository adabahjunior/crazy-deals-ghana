import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'

interface NotificationRow {
  id: string
  title: string
  message: string
  type: string
  is_active: boolean
  expires_at: string | null
  created_at: string
}

export default function AdminNotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info')
  const [expiresAt, setExpiresAt] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
    setNotifications(data ?? [])
  }

  useEffect(() => { load() }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFeedback('')
    if (!user || !title.trim() || !message.trim()) {
      setError('Title and message are required')
      return
    }

    const { error: insertError } = await supabase.from('notifications').insert({
      title: title.trim(),
      message: message.trim(),
      type,
      created_by: user.id,
      is_active: true,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setFeedback('Notification sent! Users will see it as a popup on their dashboard.')
    setTitle('')
    setMessage('')
    setExpiresAt('')
    load()
  }

  const toggleActive = async (n: NotificationRow) => {
    await supabase.from('notifications').update({ is_active: !n.is_active }).eq('id', n.id)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification?')) return
    await supabase.from('notifications').delete().eq('id', id)
    load()
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Send popup notifications to all users"
      />

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Send New Notification</h2>
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {feedback && <div className="admin-success" style={{ marginBottom: '1rem' }}>{feedback}</div>}

        <form onSubmit={handleSend}>
          <div className="form-grid">
            <div className="form-group">
              <label>Title</label>
              <input type="text" className="form-input" required placeholder="Notification title"
                value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="alert">Alert</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Message</label>
            <textarea className="form-input" rows={4} required placeholder="Write your message..."
              value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Expires At (optional)</label>
            <input type="datetime-local" className="form-input"
              value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Send to All Users</button>
          </div>
        </form>
      </div>

      <div className="content-card">
        <h2>Sent Notifications</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr key={n.id}>
                <td>{n.title}</td>
                <td><span className={`status-badge ${n.type === 'alert' ? 'failed' : n.type}`}>{n.type}</span></td>
                <td>
                  <span className={`status-badge ${n.is_active ? 'success' : 'pending'}`}>
                    {n.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(n.created_at).toLocaleString('en-GH')}</td>
                <td>{n.expires_at ? new Date(n.expires_at).toLocaleString('en-GH') : 'Never'}</td>
                <td className="table-actions">
                  <button className="btn btn-ghost" onClick={() => toggleActive(n)}>
                    {n.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-ghost admin-danger" onClick={() => handleDelete(n.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
