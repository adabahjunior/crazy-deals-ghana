import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStoreUrl } from '../lib/storeUtils'
import { useSubAgentInfo } from '../hooks/useSubAgentInfo'
import { supabase } from '../lib/supabase'

export default function MySettingsPage() {
  const { user, profile, updateProfile, updatePassword } = useAuth()
  const { info: subAgentInfo, refresh: refreshSubAgent } = useSubAgentInfo()
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
      <div className="dm-page-head">
        <div>
          <h1>Settings</h1>
          <p>Update your account information and preferences</p>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Store Status</h2>
        <p style={{ color: 'var(--dm-surface-400)', marginBottom: '1rem' }}>
          {profile?.store_published
            ? 'Your store is live and accepting orders.'
            : 'Activate your store to start selling data bundles to customers.'}
        </p>
        <div className="dm-settings-row">
          <div>
            <strong>{profile?.store_name ?? 'My Store'}</strong>
            <p style={{ color: 'var(--dm-surface-500)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {profile?.store_slug ? getStoreUrl(profile.store_slug) : 'No store link yet'}
            </p>
          </div>
          <span className={`dm-status-pill ${profile?.store_published ? 'online' : 'offline'}`}>
            {profile?.store_published ? 'Store Open' : 'Store Closed'}
          </span>
        </div>
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <Link to="/dashboard/my-store" className="btn btn-primary">
            {profile?.store_published ? 'Manage Store' : 'Activate Store'}
          </Link>
        </div>
      </div>

      {subAgentInfo?.is_sub_agent && (
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <h2>Sub-Agent Team</h2>
          <p style={{ color: 'var(--dm-surface-400)', marginBottom: '1rem' }}>
            You sell under <strong>{subAgentInfo.parent_name}</strong> with {subAgentInfo.commission_pct}% profit commission.
          </p>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                const { data, error: rpcError } = await supabase.rpc('sync_store_packages_from_parent')
                if (rpcError) setError(rpcError.message)
                else {
                  setProfileMsg(`Synced ${data ?? 0} packages from your parent agent`)
                  await refreshSubAgent()
                }
              }}
            >
              Sync Catalog from Parent
            </button>
          </div>
        </div>
      )}

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
