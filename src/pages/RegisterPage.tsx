import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import GoogleButton, { AuthDivider } from '../components/auth/AuthShared'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User } from '../components/icons'
import { formatAuthError } from '../lib/authErrors'

export default function RegisterPage() {
  const { signup, acceptSubAgentInvite, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const referralCode = searchParams.get('ref')?.trim() || ''
  const inviteCode = searchParams.get('invite')?.trim() || ''
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const loginHref = inviteCode
    ? `/auth/login?invite=${encodeURIComponent(inviteCode)}`
    : referralCode
      ? `/auth/login?ref=${encodeURIComponent(referralCode)}`
      : '/auth/login'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!fullName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: authError, session } = await signup(
      email,
      password,
      fullName.trim(),
      referralCode || undefined,
    )

    if (authError) {
      setError(formatAuthError(authError))
      setLoading(false)
      return
    }

    if (session && phone.trim()) {
      await updateProfile({ phone: phone.trim() })
    }

    if (session) {
      if (inviteCode) {
        const { error: inviteError } = await acceptSubAgentInvite(inviteCode)
        if (inviteError) setMessage(`Account created, but invite failed: ${inviteError}`)
      }
      navigate('/dashboard')
    } else {
      setMessage('Account created! Check your email if confirmation is required, then sign in.')
    }

    setLoading(false)
  }

  return (
    <AuthLayout variant="register">
      <div className="dm-auth-card register">
        <div className="dm-auth-card-head register">
          <h2>Create Account</h2>
          <p>Start your data business today</p>
        </div>

        {referralCode && (
          <div className="dm-auth-banner info">You were referred! Your referrer earns bonus points when you sign up.</div>
        )}

        {inviteCode && (
          <div className="dm-auth-banner warn">Sub-agent invite detected. Create an account to join the team.</div>
        )}

        <GoogleButton
          variant="register"
          onClick={() => setMessage('Google sign-in is not configured yet. Please use email.')}
        />

        <AuthDivider label="or register with email" variant="register" />

        <form className="dm-auth-form register" onSubmit={handleSubmit}>
          {error && <div className="dm-auth-alert error">{error}</div>}
          {message && <div className="dm-auth-alert success">{message}</div>}

          <AuthInput
            id="registerName"
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<User />}
            variant="register"
            required
          />

          <AuthInput
            id="registerEmail"
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail />}
            variant="register"
            required
          />

          <AuthInput
            id="registerPhone"
            label="Phone Number"
            type="tel"
            placeholder="0241234567"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone />}
            variant="register"
            required
          />

          <AuthInput
            id="registerPassword"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 6 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock />}
            variant="register"
            suffix={
              <button
                type="button"
                className="dm-auth-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            }
            required
          />

          <AuthInput
            id="registerConfirm"
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock />}
            variant="register"
            required
          />

          <button type="submit" className="dm-auth-submit register" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <ArrowRight />}
          </button>
        </form>

        <p className="dm-auth-footer register">
          Already have an account? <Link to={loginHref}>Sign In</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
