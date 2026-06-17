import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import SpinWheel from '../components/SpinWheel'
import { useGamification } from '../hooks/useGamification'
import { useAuth } from '../context/AuthContext'
import { fulfillDataOrder, waitForTransaction } from '../lib/fulfillment'
import { networkLabels, type NetworkType } from '../types/database'
import { formatDate } from '../hooks/useTransactions'

const REDEEM_NETWORKS: NetworkType[] = ['mtn', 'airtel-ishare', 'telecel']

export default function RewardsPage() {
  const { refreshProfile } = useAuth()
  const {
    status,
    pointHistory,
    spinHistory,
    referrals,
    loading,
    error,
    refresh,
    spin,
    claimDataPrize,
    redeemPoints,
  } = useGamification()

  const [spinning, setSpinning] = useState(false)
  const [targetSegment, setTargetSegment] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [pendingDataSpinId, setPendingDataSpinId] = useState<string | null>(null)
  const [claimPhone, setClaimPhone] = useState('')
  const [redeemNetwork, setRedeemNetwork] = useState<NetworkType>('mtn')
  const [redeemPhone, setRedeemPhone] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const referralLink = useMemo(() => {
    if (!status?.referral_code) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://crazydealsgh.shop'
    return `${origin}/?ref=${status.referral_code}`
  }, [status?.referral_code])

  const handleSpin = async () => {
    if (!status?.can_spin) return
    setActionError('')
    setMessage('')
    setSpinning(true)
    setTargetSegment(null)

    const { error: spinError, result } = await spin()
    if (spinError || !result) {
      setSpinning(false)
      setActionError(spinError ?? 'Spin failed')
      return
    }

    setTargetSegment(result.segment_index)
    window.setTimeout(async () => {
      setSpinning(false)
      if (result.prize_type === 'points') {
        setMessage(`You won ${result.prize_label}!`)
        await refreshProfile()
      } else {
        setPendingDataSpinId(result.spin_id)
        setMessage(`You won ${result.prize_label}! Enter your phone number to claim it.`)
      }
    }, 4200)
  }

  const handleClaimData = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingDataSpinId) return
    setClaiming(true)
    setActionError('')
    setMessage('')

    const { error: claimError, transactionId } = await claimDataPrize(pendingDataSpinId, claimPhone)
    if (claimError || !transactionId) {
      setClaiming(false)
      setActionError(claimError ?? 'Failed to claim data prize')
      return
    }

    await fulfillDataOrder(transactionId)
    const outcome = await waitForTransaction(transactionId)
    setClaiming(false)
    setPendingDataSpinId(null)
    setClaimPhone('')

    if (outcome.status === 'success') {
      setMessage('Data prize delivered successfully!')
    } else if (outcome.status === 'processing') {
      setMessage(outcome.error ?? 'Data prize is processing. Check Transaction History.')
    } else {
      setActionError(outcome.error ?? 'Data delivery failed')
    }

    await refreshProfile()
    await refresh()
  }

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!status) return
    setRedeeming(true)
    setActionError('')
    setMessage('')

    const { error: redeemError, transactionId } = await redeemPoints(redeemNetwork, redeemPhone)
    if (redeemError || !transactionId) {
      setRedeeming(false)
      setActionError(redeemError ?? 'Redemption failed')
      return
    }

    await fulfillDataOrder(transactionId)
    const outcome = await waitForTransaction(transactionId)
    setRedeeming(false)
    setRedeemPhone('')

    if (outcome.status === 'success') {
      setMessage(`Redeemed ${status.redemption_threshold} points for 1GB data!`)
    } else if (outcome.status === 'processing') {
      setMessage(outcome.error ?? 'Redemption is processing. Check Transaction History.')
    } else {
      setActionError(outcome.error ?? 'Redemption delivery failed')
    }

    await refreshProfile()
    await refresh()
  }

  const copyReferralLink = async () => {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink)
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 2500)
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Rewards" description="Spin, earn points, and redeem data" />
        <div className="content-card"><p style={{ color: 'var(--text-secondary)' }}>Loading rewards...</p></div>
      </>
    )
  }

  const threshold = status?.redemption_threshold ?? 100
  const canRedeem = (status?.points_balance ?? 0) >= threshold

  return (
    <>
      <PageHeader
        title="Rewards & Spin Wheel"
        description="Spin once every 25 days, refer friends for points, and redeem 100 points for 1GB data"
      />

      {message && <div className="admin-success" style={{ marginBottom: '1rem' }}>{message}</div>}
      {(error || actionError) && (
        <div className="auth-error" style={{ marginBottom: '1rem' }}>{error || actionError}</div>
      )}

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="label">Your Points</div>
          <div className="value accent">{status?.points_balance ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Redeem At</div>
          <div className="value">{threshold} pts</div>
        </div>
        <div className="stat-card">
          <div className="label">Bonus Spins</div>
          <div className="value">{status?.bonus_spin_chances ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Next Free Spin</div>
          <div className="value" style={{ fontSize: '1.1rem' }}>
            {status?.can_spin ? 'Available now' : `${status?.days_until_spin ?? 0} days`}
          </div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Spin the Wheel</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Three prizes: 5 points, 10 points, or up to 1GB data. Data is rare — good luck!
          Free spin every {status?.spin_interval_days ?? 25} days.
        </p>
        <SpinWheel
          canSpin={!!status?.can_spin}
          spinning={spinning}
          targetSegment={targetSegment}
          onSpin={handleSpin}
        />
      </div>

      {pendingDataSpinId && (
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <h2>Claim Your Data Prize</h2>
          <form onSubmit={handleClaimData}>
            <div className="form-group">
              <label htmlFor="claimPhone">Phone Number</label>
              <input
                id="claimPhone"
                type="tel"
                className="form-input"
                placeholder="0244123456"
                value={claimPhone}
                onChange={(e) => setClaimPhone(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={claiming}>
              {claiming ? 'Delivering...' : 'Claim Data Prize'}
            </button>
          </form>
        </div>
      )}

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Refer Friends</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Share your link. When someone signs up, you earn {status?.referral_points ?? 10} points.
        </p>
        <div className="store-link-box" style={{ marginBottom: '1rem' }}>
          <span className="store-link-url">{referralLink || '—'}</span>
        </div>
        {linkCopied && <p className="store-link-feedback">Referral link copied!</p>}
        <button type="button" className="btn btn-secondary" onClick={copyReferralLink}>
          Copy Referral Link
        </button>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
          Referrals completed: {referrals.length}
        </p>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Redeem Points for 1GB Data</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          {threshold} points = 1GB data bundle (max 1GB per redemption).
        </p>
        <form onSubmit={handleRedeem}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="redeemNetwork">Network</label>
              <select
                id="redeemNetwork"
                className="form-input"
                value={redeemNetwork}
                onChange={(e) => setRedeemNetwork(e.target.value as NetworkType)}
              >
                {REDEEM_NETWORKS.map((network) => (
                  <option key={network} value={network}>{networkLabels[network]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="redeemPhone">Phone Number</label>
              <input
                id="redeemPhone"
                type="tel"
                className="form-input"
                placeholder="0244123456"
                value={redeemPhone}
                onChange={(e) => setRedeemPhone(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!canRedeem || redeeming}>
            {redeeming ? 'Redeeming...' : `Redeem ${threshold} Points`}
          </button>
          {!canRedeem && (
            <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              You need {threshold - (status?.points_balance ?? 0)} more points to redeem.
            </p>
          )}
        </form>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <h2>Points History</h2>
        {pointHistory.length === 0 ? (
          <div className="empty-state"><p>No point activity yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Points</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {pointHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.created_at)}</td>
                    <td>{item.type}</td>
                    <td>{item.amount > 0 ? `+${item.amount}` : item.amount}</td>
                    <td>{item.description ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="content-card">
        <h2>Spin History</h2>
        {spinHistory.length === 0 ? (
          <div className="empty-state"><p>No spins yet.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Prize</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {spinHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.created_at)}</td>
                    <td>{item.prize_label}</td>
                    <td>
                      {item.prize_type === 'data'
                        ? (item.claimed ? `Delivered to ${item.phone}` : 'Awaiting claim')
                        : `+${item.points_awarded} pts`}
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
