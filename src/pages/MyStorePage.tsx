import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../hooks/useTransactions'
import { supabase } from '../lib/supabase'
import { getStoreUrl, copyToClipboard, shareStoreLink } from '../lib/storeUtils'
import AgentStorePackageManager from '../components/AgentStorePackageManager'

interface StoreActivationInfo {
  enabled: boolean
  cost: number
  paid: boolean
  is_agent: boolean
}

export default function MyStorePage() {
  const { profile, refreshProfile, user } = useAuth()
  const [orderCount, setOrderCount] = useState(0)
  const [activation, setActivation] = useState<StoreActivationInfo | null>(null)
  const [storeName, setStoreName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [linkFeedback, setLinkFeedback] = useState('')
  const [activePackageCount, setActivePackageCount] = useState(0)

  const isPublished = profile?.store_published && profile?.store_slug
  const storeUrl = profile?.store_slug ? getStoreUrl(profile.store_slug) : ''

  const loadPackageCount = async () => {
    if (!user) return
    const { count } = await supabase
      .from('store_packages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
    setActivePackageCount(count ?? 0)
  }

  useEffect(() => {
    if (!profile) return
    setStoreName(profile.store_name ?? '')
    setWhatsapp(profile.store_whatsapp ?? '')
    loadPackageCount()

    supabase
      .from('store_orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_user_id', profile.id)
      .then(({ count }) => setOrderCount(count ?? 0))

    supabase.rpc('get_store_activation_info').then(({ data, error: rpcError }) => {
      if (!rpcError && data) setActivation(data as StoreActivationInfo)
    })
  }, [profile, user])

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error: rpcError } = await supabase.rpc('create_or_update_store', {
      p_store_name: storeName.trim(),
      p_whatsapp: whatsapp.trim(),
    } as { p_store_name: string; p_whatsapp: string })

    setLoading(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    await refreshProfile()
    setMessage(isPublished ? 'Store updated successfully!' : 'Your mini store is live! Add packages below, then share your link.')
  }

  const handleCopy = async () => {
    if (!storeUrl) return
    await copyToClipboard(storeUrl)
    setLinkFeedback('Link copied to clipboard!')
    setTimeout(() => setLinkFeedback(''), 2500)
  }

  const handleShare = async () => {
    if (!storeUrl || !profile?.store_name) return
    const shared = await shareStoreLink(storeUrl, profile.store_name)
    setLinkFeedback(shared ? 'Shared successfully!' : 'Link copied! (Share not supported on this device)')
    setTimeout(() => setLinkFeedback(''), 2500)
  }

  const handleVisit = () => {
    if (storeUrl) window.open(storeUrl, '_blank', 'noopener,noreferrer')
  }

  const needsActivationFee =
    !isPublished &&
    activation?.enabled &&
    !activation.paid &&
    activation.cost > 0

  const activeCount = activePackageCount

  return (
    <>
      <PageHeader
        title="My Store"
        description={
          isPublished
            ? 'You are an Agent — you buy data at agent rates across the platform'
            : 'Create your mini data store to become an Agent and unlock agent pricing'
        }
      />

      {isPublished && (
        <div className="content-card" style={{ marginBottom: '1.5rem', borderColor: 'var(--accent)' }}>
          <span className="status-badge success">Agent Account</span>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', marginBottom: 0, fontSize: '0.95rem' }}>
            Your store is live. You now buy data packages at <strong>agent prices</strong> instead of user prices.
          </p>
        </div>
      )}

      {message && <div className="admin-success" style={{ marginBottom: '1.5rem' }}>{message}</div>}

      {/* Step 1: Store details */}
      <div className="content-card store-setup-card">
        <h2>{isPublished ? 'Your Store Details' : 'Step 1 — Create Your Store'}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Enter your store name and WhatsApp support number. We&apos;ll build a mini website
          where customers can browse and order your data packages. Creating a store makes you an <strong>Agent</strong>.
        </p>

        {needsActivationFee && (
          <div className="content-card" style={{ marginBottom: '1.25rem', background: 'var(--bg-primary)' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Store activation fee: <strong>{formatMoney(activation!.cost)}</strong> will be deducted from your wallet when you create your store.
              Your current balance: <strong>{formatMoney(profile?.wallet_balance ?? 0)}</strong>
            </p>
            {(profile?.wallet_balance ?? 0) < activation!.cost && (
              <p style={{ margin: '0.75rem 0 0', color: 'var(--accent)' }}>
                Top up your wallet before creating a store.
              </p>
            )}
          </div>
        )}

        {!needsActivationFee && !isPublished && activation?.enabled === false && (
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            Store creation is currently <strong>free</strong>.
          </p>
        )}

        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleCreateStore}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="storeName">Store Name</label>
              <input
                id="storeName"
                type="text"
                className="form-input"
                placeholder="e.g. Junior Data Hub"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="whatsapp">Store Support WhatsApp Number</label>
              <input
                id="whatsapp"
                type="tel"
                className="form-input"
                placeholder="e.g. 0244123456"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading || (needsActivationFee && (profile?.wallet_balance ?? 0) < (activation?.cost ?? 0))}>
              {loading ? 'Saving...' : isPublished ? 'Update Store' : needsActivationFee ? `Create Store (${formatMoney(activation!.cost)})` : 'Create My Store'}
            </button>
          </div>
        </form>
      </div>

      {/* Step 2: Store link (only when published) */}
      {isPublished && (
        <div className="content-card store-live-card">
          <div className="store-live-badge">Your mini store is live</div>
          <h2>{profile?.store_name}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            WhatsApp support: <strong>{profile?.store_whatsapp}</strong>
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Customers visit this link to browse packages and place orders.
          </p>

          <div className="store-link-box">
            <span className="store-link-url">{storeUrl}</span>
          </div>

          {linkFeedback && <p className="store-link-feedback">{linkFeedback}</p>}

          <div className="store-link-actions">
            <button type="button" className="btn btn-primary" onClick={handleVisit}>
              Visit Store
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCopy}>
              Copy Link
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleShare}>
              Share
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {isPublished && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="label">Store Balance</div>
            <div className="value accent">{formatMoney(profile?.store_balance ?? 0)}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Orders</div>
            <div className="value">{orderCount}</div>
          </div>
          <div className="stat-card">
            <div className="label">Active Packages</div>
            <div className="value">{activeCount}</div>
          </div>
        </div>
      )}

      {/* Step 2: Packages */}
      {isPublished && (
        <div className="content-card">
          <AgentStorePackageManager
            showPreview
            onMessage={(msg) => {
              setMessage(msg)
              loadPackageCount()
            }}
          />
        </div>
      )}

      {/* Quick links */}
      {isPublished && (
        <div className="content-card">
          <h2>Store Orders & Earnings</h2>
          <div className="quick-actions">
            <Link to="/dashboard/store-orders" className="quick-action">
              <span className="quick-action-text">View Orders</span>
            </Link>
            <Link to="/dashboard/store-withdrawal" className="quick-action">
              <span className="quick-action-text">Withdraw Earnings</span>
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
