import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatMoney } from '../../hooks/useTransactions'
import { networkLabels, type NetworkType, type StorePackage } from '../../types/database'

export default function AgentPricingPage() {
  const { user, profile } = useAuth()
  const [packages, setPackages] = useState<StorePackage[]>([])
  const [defaultCommission, setDefaultCommission] = useState('10')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('store_packages')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .then(({ data }) => {
        setPackages(data ?? [])
        setLoading(false)
      })
    setDefaultCommission(String(profile?.sub_agent_commission_pct ?? 10))
  }, [user, profile])

  const commissionPct = parseFloat(defaultCommission) || 0

  const priced = useMemo(() => {
    return packages.map((pkg) => {
      const retail = Number(pkg.price)
      const base = Number(pkg.base_price ?? retail - Number(pkg.profit ?? 0))
      const subAgentPrice = retail - (Number(pkg.profit ?? 0) * commissionPct / 100)
      const subAgentProfit = retail - subAgentPrice
      return { ...pkg, retail, base, subAgentPrice, subAgentProfit }
    })
  }, [packages, commissionPct])

  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Agent Pricing</h1>
          <p>Set recommended prices for your sub-agents based on commission</p>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1rem' }}>
        <h2>Default Commission</h2>
        <p style={{ color: 'var(--dm-surface-400)', marginBottom: '1rem' }}>
          This percentage determines how much of your profit sub-agents keep. Update individual sub-agent rates on the Sub-Agents page.
        </p>
        <div className="form-group" style={{ maxWidth: '12rem' }}>
          <label htmlFor="defaultCommission">Commission %</label>
          <input
            id="defaultCommission"
            type="number"
            min="0"
            max="100"
            className="form-input"
            value={defaultCommission}
            onChange={(e) => setDefaultCommission(e.target.value)}
          />
        </div>
      </div>

      <div className="content-card">
        <h2>Sub-Agent Price Guide</h2>
        {loading ? (
          <p style={{ color: 'var(--dm-surface-400)' }}>Loading packages...</p>
        ) : priced.length === 0 ? (
          <div className="empty-state"><p>Add products first to see sub-agent pricing.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Your Price</th>
                  <th>Your Profit</th>
                  <th>Sub-Agent Price</th>
                  <th>Sub-Agent Profit</th>
                </tr>
              </thead>
              <tbody>
                {priced.map((pkg) => (
                  <tr key={pkg.id}>
                    <td>{networkLabels[pkg.network as NetworkType] ?? pkg.network} {pkg.size_gb}GB</td>
                    <td>{formatMoney(pkg.retail)}</td>
                    <td>{formatMoney(Number(pkg.profit ?? 0))}</td>
                    <td>{formatMoney(pkg.subAgentPrice)}</td>
                    <td className="accent">{formatMoney(pkg.subAgentProfit)}</td>
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
