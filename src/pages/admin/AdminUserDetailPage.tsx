import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import { accountTypeLabel } from '../../lib/pricing'
import { getStoreUrl } from '../../lib/storeUtils'
import type { Profile, StoreOrder, Transaction } from '../../types/database'
import { formatDate, formatMoney } from '../../hooks/useTransactions'

const typeLabels: Record<string, string> = {
  data_purchase: 'Data Purchase',
  wallet_topup: 'Wallet Top Up',
  store_order: 'Store Order',
  withdrawal: 'Withdrawal',
  store_activation: 'Store Activation',
}

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [crediting, setCrediting] = useState(false)
  const [spinCount, setSpinCount] = useState('')
  const [spinNote, setSpinNote] = useState('')
  const [grantingSpins, setGrantingSpins] = useState(false)
  const [pointsAdjust, setPointsAdjust] = useState('')
  const [pointsNote, setPointsNote] = useState('')
  const [adjustingPoints, setAdjustingPoints] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError('')

    const [profileRes, txRes, ordersRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('store_orders')
        .select('*')
        .eq('store_user_id', userId)
        .order('created_at', { ascending: false }),
    ])

    if (profileRes.error) {
      setError(profileRes.error.message)
      setProfile(null)
    } else {
      setProfile(profileRes.data)
    }

    setTransactions(txRes.data ?? [])
    setStoreOrders(ordersRes.data ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  const handleCreditWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const amount = parseFloat(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount greater than zero')
      return
    }

    setCrediting(true)
    setError('')
    setMessage('')

    const { error: rpcError } = await supabase.rpc('admin_credit_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_note: creditNote.trim() || null,
    } as { p_user_id: string; p_amount: number; p_note: string | null })

    setCrediting(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setCreditAmount('')
    setCreditNote('')
    setMessage(`Credited ${formatMoney(amount)} to wallet`)
    load()
  }

  const handleGrantSpins = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const count = parseInt(spinCount, 10)
    if (isNaN(count) || count <= 0) {
      setError('Enter a valid spin count greater than zero')
      return
    }

    setGrantingSpins(true)
    setError('')
    setMessage('')

    const { error: rpcError } = await supabase.rpc('admin_grant_spin_chances', {
      p_user_id: userId,
      p_count: count,
      p_note: spinNote.trim() || null,
    } as { p_user_id: string; p_count: number; p_note: string | null })

    setGrantingSpins(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setSpinCount('')
    setSpinNote('')
    setMessage(`Granted ${count} bonus spin${count === 1 ? '' : 's'}`)
    load()
  }

  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    const amount = parseInt(pointsAdjust, 10)
    if (isNaN(amount) || amount === 0) {
      setError('Enter a non-zero points amount')
      return
    }

    setAdjustingPoints(true)
    setError('')
    setMessage('')

    const { error: rpcError } = await supabase.rpc('admin_adjust_points', {
      p_user_id: userId,
      p_amount: amount,
      p_note: pointsNote.trim() || null,
    } as { p_user_id: string; p_amount: number; p_note: string | null })

    setAdjustingPoints(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setPointsAdjust('')
    setPointsNote('')
    setMessage(`Adjusted points by ${amount > 0 ? '+' : ''}${amount}`)
    load()
  }

  const copyStoreLink = async () => {
    if (!profile?.store_slug) return
    await navigator.clipboard.writeText(getStoreUrl(profile.store_slug))
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  }

  if (loading) {
    return (
      <>
        <PageHeader title="User Account" description="Loading account details..." />
        <div className="content-card">
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <PageHeader title="User Not Found" description="This account could not be loaded" />
        <div className="content-card">
          {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          <Link to="/admin/users" className="btn btn-secondary">Back to Users</Link>
        </div>
      </>
    )
  }

  const storeUrl = profile.store_slug ? getStoreUrl(profile.store_slug) : null

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/admin/users" className="btn btn-ghost" style={{ paddingLeft: 0 }}>
          ← Back to Users
        </Link>
      </div>

      <PageHeader
        title={profile.full_name ?? profile.email ?? 'User Account'}
        description={profile.email ?? 'Account overview and activity'}
      />

      {message && <div className="admin-success" style={{ marginBottom: '1rem' }}>{message}</div>}
      {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="label">Wallet Balance</div>
          <div className="value accent">{formatMoney(profile.wallet_balance)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Store Balance</div>
          <div className="value">{formatMoney(profile.store_balance)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Deposits</div>
          <div className="value">{formatMoney(profile.total_deposits)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Spent</div>
          <div className="value">{formatMoney(profile.total_spent)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Reward Points</div>
          <div className="value accent">{profile.points_balance ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Bonus Spins</div>
          <div className="value">{profile.bonus_spin_chances ?? 0}</div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Account Info</h2>
        <div className="form-grid" style={{ marginTop: '1rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email</div>
            <div>{profile.email ?? '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Phone</div>
            <div>{profile.phone ?? '—'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Account Type</div>
            <span className={`status-badge ${profile.store_published ? 'success' : 'info'}`}>
              {accountTypeLabel(profile.store_published)}
            </span>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Role</div>
            <span className={`status-badge ${profile.is_admin ? 'alert' : 'pending'}`}>
              {profile.is_admin ? 'Admin' : 'User'}
            </span>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Joined</div>
            <div>{formatDate(profile.created_at)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Store Name</div>
            <div>{profile.store_name ?? '—'}</div>
          </div>
        </div>
      </div>

      {profile.store_published && storeUrl && (
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <h2>Store Link</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
            WhatsApp: <strong>{profile.store_whatsapp ?? '—'}</strong>
          </p>
          <div className="store-link-box" style={{ marginBottom: '1rem' }}>
            <span className="store-link-url">{storeUrl}</span>
          </div>
          {linkCopied && <p className="store-link-feedback">{linkCopied ? 'Link copied!' : ''}</p>}
          <div className="form-actions">
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Visit Store
            </a>
            <button type="button" className="btn btn-secondary" onClick={copyStoreLink}>
              Copy Link
            </button>
          </div>
        </div>
      )}

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Credit Wallet</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
          Add funds to this user&apos;s wallet. A top-up transaction will be recorded.
        </p>
        <form onSubmit={handleCreditWallet}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="creditAmount">Amount (GHS)</label>
              <input
                id="creditAmount"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                required
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="e.g. 50.00"
              />
            </div>
            <div className="form-group">
              <label htmlFor="creditNote">Note (optional)</label>
              <input
                id="creditNote"
                type="text"
                className="form-input"
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                placeholder="Reason for credit"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={crediting}>
              {crediting ? 'Crediting...' : 'Credit Wallet'}
            </button>
          </div>
        </form>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Grant Bonus Spins</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
          Give this user extra spin chances that bypass the 25-day cooldown.
        </p>
        <form onSubmit={handleGrantSpins}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="spinCount">Number of Spins</label>
              <input
                id="spinCount"
                type="number"
                min="1"
                className="form-input"
                required
                value={spinCount}
                onChange={(e) => setSpinCount(e.target.value)}
                placeholder="e.g. 3"
              />
            </div>
            <div className="form-group">
              <label htmlFor="spinNote">Note (optional)</label>
              <input
                id="spinNote"
                type="text"
                className="form-input"
                value={spinNote}
                onChange={(e) => setSpinNote(e.target.value)}
                placeholder="Reason for bonus spins"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={grantingSpins}>
              {grantingSpins ? 'Granting...' : 'Grant Spins'}
            </button>
          </div>
        </form>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Adjust Reward Points</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
          Add or remove points. Use negative values to deduct.
        </p>
        <form onSubmit={handleAdjustPoints}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="pointsAdjust">Points (+/-)</label>
              <input
                id="pointsAdjust"
                type="number"
                className="form-input"
                required
                value={pointsAdjust}
                onChange={(e) => setPointsAdjust(e.target.value)}
                placeholder="e.g. 10 or -5"
              />
            </div>
            <div className="form-group">
              <label htmlFor="pointsNote">Note (optional)</label>
              <input
                id="pointsNote"
                type="text"
                className="form-input"
                value={pointsNote}
                onChange={(e) => setPointsNote(e.target.value)}
                placeholder="Reason for adjustment"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={adjustingPoints}>
              {adjustingPoints ? 'Updating...' : 'Adjust Points'}
            </button>
          </div>
        </form>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Transaction History</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
          Platform wallet activity — purchases, top-ups, withdrawals, and store activation.
        </p>
        {transactions.length === 0 ? (
          <div className="empty-state"><p>No transactions yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Network</th>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.created_at)}</td>
                    <td>{typeLabels[tx.type] ?? tx.type}</td>
                    <td>{tx.description ?? '—'}</td>
                    <td>{tx.network ?? '—'}</td>
                    <td>{tx.phone ?? '—'}</td>
                    <td>{formatMoney(tx.amount)}</td>
                    <td>
                      <span className={`status-badge ${tx.status}`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="content-card">
        <h2>Store Orders</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
          Orders placed by customers on this agent&apos;s mini store.
        </p>
        {!profile.store_published ? (
          <p style={{ color: 'var(--text-muted)' }}>This user does not have a published store.</p>
        ) : storeOrders.length === 0 ? (
          <div className="empty-state"><p>No store orders yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {storeOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{order.customer_phone}</td>
                    <td>{order.package_label}</td>
                    <td>{formatMoney(order.amount)}</td>
                    <td>
                      <span className={`status-badge ${order.status}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
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
