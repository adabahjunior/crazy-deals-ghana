import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'

export default function MySettingsPage() {
  const { user, profile, updateProfile, updatePassword } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setPhone(profile?.phone ?? '')
  }, [profile])

  const handleSaveProfile = async () => {
    setError('')
    setProfileMsg('')
    setLoading(true)
    const { error: updateError } = await updateProfile({ full_name: fullName, phone })
    setLoading(false)
    if (updateError) setError(updateError)
    else setProfileMsg('Profile updated successfully')
  }

  const handleUpdatePassword = async () => {
    setError('')
    setPasswordMsg('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const result = await updatePassword(newPassword)
    setLoading(false)
    if (result.error) setError(result.error)
    else {
      setPasswordMsg('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <>
      <PageHeader
        title="My Settings"
        description="Update your account information and preferences"
      />

      <div className="content-card">
        <h2>Profile Information</h2>
        {profileMsg && (
          <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{profileMsg}</div>
        )}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={user?.email ?? ''}
              disabled
            />
          </div>
          <div className="form-group">
            <label htmlFor="settingsPhone">Phone Number</label>
            <input
              id="settingsPhone"
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleSaveProfile} disabled={loading}>
            Save Changes
          </button>
        </div>
      </div>

      <div className="content-card">
        <h2>Change Password</h2>
        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {passwordMsg && (
          <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{passwordMsg}</div>
        )}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleUpdatePassword} disabled={loading}>
            Update Password
          </button>
        </div>
      </div>
    </>
  )
}
