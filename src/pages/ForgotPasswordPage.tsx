import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import { ArrowRight, Mail, Smartphone } from '../components/icons'

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'phone') {
      setError('Phone reset is not available yet. Please use email.')
      return
    }

    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/login`,
    })
    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setMessage('If an account exists for that email, a reset link has been sent.')
  }

  return (
    <AuthLayout variant="forgot">
      <div className="dm-auth-card login">
        <div className="dm-auth-card-head">
          <h2>Forgot Password?</h2>
          <p>We&apos;ll send you a verification code</p>
        </div>

        <div className="dm-auth-tabs">
          <button type="button" className={mode === 'email' ? 'active' : ''} onClick={() => setMode('email')}>
            Email
          </button>
          <button type="button" className={mode === 'phone' ? 'active' : ''} onClick={() => setMode('phone')}>
            Phone
          </button>
        </div>

        <form className="dm-auth-form login" onSubmit={handleSubmit}>
          {error && <div className="dm-auth-alert error">{error}</div>}
          {message && <div className="dm-auth-alert success">{message}</div>}

          {mode === 'email' ? (
            <>
              <AuthInput
                id="forgotEmail"
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
              <p className="dm-auth-help">We&apos;ll send a reset link to your email.</p>
            </>
          ) : (
            <>
              <AuthInput
                id="forgotPhone"
                label="Phone Number"
                type="tel"
                placeholder="0241234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                icon={<Smartphone />}
                variant="login"
              />
              <p className="dm-auth-help">Phone reset is coming soon. Use email for now.</p>
            </>
          )}

          <button type="submit" className="dm-auth-submit login" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Code'}
            {!loading && <ArrowRight />}
          </button>
        </form>

        <p className="dm-auth-footer login">
          <Link to="/auth/login">Back to Sign In</Link>
        </p>
        <p className="dm-auth-footer subtle">
          Need help?{' '}
          <a href="https://wa.me/233241234567" target="_blank" rel="noopener noreferrer">
            Contact CrazyDeals support on WhatsApp
          </a>
        </p>
      </div>
    </AuthLayout>
  )
}
