import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import GoogleButton, { AuthDivider } from '../components/auth/AuthShared'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from '../components/icons'
import { formatAuthError } from '../lib/authErrors'

export default function LoginPage() {
  const { login, acceptSubAgentInvite } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteCode = searchParams.get('invite')?.trim() || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error: authError } = await login(email, password)
    if (authError) {
      setError(formatAuthError(authError))
      setLoading(false)
      return
    }

    if (inviteCode) {
      const { error: inviteError } = await acceptSubAgentInvite(inviteCode)
      if (inviteError) setMessage(`Signed in, but invite failed: ${inviteError}`)
    }

    navigate('/dashboard')
    setLoading(false)
  }

  return (
    <AuthLayout variant="login">
      <div className="dm-auth-card login">
        <div className="dm-auth-card-head">
          <h2>Welcome Back</h2>
          <p>Sign in to your agent account</p>
        </div>

        {inviteCode && (
          <div className="dm-auth-banner info">Sub-agent invite detected. Sign in to join the team.</div>
        )}

        <GoogleButton
          variant="login"
          onClick={() => setMessage('Google sign-in is not configured yet. Please use email.')}
        />

        <AuthDivider label="or" variant="login" />

        <form className="dm-auth-form login" onSubmit={handleSubmit}>
          {error && <div className="dm-auth-alert error">{error}</div>}
          {message && <div className="dm-auth-alert success">{message}</div>}

          <AuthInput
            id="loginEmail"
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail />}
            variant="login"
            required
          />

          <AuthInput
            id="loginPassword"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock />}
            variant="login"
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

          <div className="dm-auth-row">
            <Link to="/auth/forgot-password" className="dm-auth-link">Forgot password?</Link>
          </div>

          <button type="submit" className="dm-auth-submit login" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight />}
          </button>
        </form>

        <p className="dm-auth-footer login">
          Don&apos;t have an account?{' '}
          <a href="https://wa.me/233241234567" target="_blank" rel="noopener noreferrer">
            Contact CrazyDeals support on WhatsApp
          </a>{' '}
          to become an agent.
        </p>
      </div>
    </AuthLayout>
  )
}
