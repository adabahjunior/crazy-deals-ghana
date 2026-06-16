import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCatalogPackages } from '../hooks/useCatalogPackages'
import { formatMoney } from '../hooks/useTransactions'
import { networkCardClass } from '../lib/storeUtils'
import {
  NETWORK_ORDER,
  catalogOptionLabel,
  groupByNetwork,
  sortByNetworkAndSize,
} from '../lib/networkOrder'
import NetworkSwitcher, { defaultNetworkSelection } from './NetworkSwitcher'
import type { StorePackage } from '../types/database'
import { networkLabels, type NetworkType } from '../types/database'

interface AgentStorePackageManagerProps {
  onMessage?: (msg: string) => void
  showPreview?: boolean
}

export default function AgentStorePackageManager({
  onMessage,
  showPreview = true,
}: AgentStorePackageManagerProps) {
  const { user } = useAuth()
  const { packages: catalog, loading: catalogLoading } = useCatalogPackages()
  const [packages, setPackages] = useState<StorePackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formNetwork, setFormNetwork] = useState<NetworkType>('mtn')
  const [selectedCatalogId, setSelectedCatalogId] = useState('')
  const [profit, setProfit] = useState('')
  const [pkgLoading, setPkgLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editProfit, setEditProfit] = useState('')
  const [previewNetwork, setPreviewNetwork] = useState('')

  const loadPackages = async () => {
    if (!user) return
    const { data } = await supabase
      .from('store_packages')
      .select('*')
      .eq('user_id', user.id)
    setPackages(sortByNetworkAndSize(data ?? []))
    setLoading(false)
  }

  useEffect(() => { loadPackages() }, [user])

  const sortedPackages = useMemo(() => sortByNetworkAndSize(packages), [packages])
  const activePackages = useMemo(() => sortedPackages.filter((p) => p.is_active), [sortedPackages])
  const packageGroups = useMemo(() => groupByNetwork(activePackages), [activePackages])

  useEffect(() => {
    if (activePackages.length === 0) {
      setPreviewNetwork('')
      return
    }
    const keys = packageGroups.map((g) => g.network)
    if (!previewNetwork || !keys.includes(previewNetwork)) {
      setPreviewNetwork(defaultNetworkSelection(keys))
    }
  }, [activePackages, packageGroups, previewNetwork])

  const usedCatalogIds = useMemo(
    () => new Set(packages.map((p) => p.data_package_id).filter(Boolean)),
    [packages]
  )

  const availableCatalog = useMemo(
    () => sortByNetworkAndSize(catalog.filter((p) => !usedCatalogIds.has(p.id))),
    [catalog, usedCatalogIds]
  )

  const availableForNetwork = useMemo(
    () =>
      availableCatalog
        .filter((p) => p.network === formNetwork)
        .sort((a, b) => Number(a.size_gb) - Number(b.size_gb)),
    [availableCatalog, formNetwork]
  )

  const networksWithAvailability = useMemo(() => {
    const set = new Set(availableCatalog.map((p) => p.network))
    return NETWORK_ORDER.filter((n) => set.has(n))
  }, [availableCatalog])

  const selectedCatalog = catalog.find((p) => p.id === selectedCatalogId)
  const profitNum = parseFloat(profit) || 0
  const customerPrice = selectedCatalog
    ? Number(selectedCatalog.agent_price) + profitNum
    : 0

  const previewPackages = packageGroups.find((g) => g.network === previewNetwork)?.packages ?? []

  const openForm = () => {
    const firstAvailable =
      NETWORK_ORDER.find((n) => availableCatalog.some((p) => p.network === n)) ?? 'mtn'
    setShowForm(true)
    setError('')
    setFormNetwork(firstAvailable)
    setSelectedCatalogId('')
    setProfit('')
  }

  useEffect(() => {
    if (!showForm || availableForNetwork.length > 0) return
    const next = NETWORK_ORDER.find((n) =>
      availableCatalog.some((p) => p.network === n)
    )
    if (next && next !== formNetwork) {
      setFormNetwork(next)
      setSelectedCatalogId('')
    }
  }, [showForm, availableForNetwork.length, availableCatalog, formNetwork])

  const handleFormNetworkChange = (network: NetworkType) => {
    setFormNetwork(network)
    setSelectedCatalogId('')
  }

  const handleAdd = async () => {
    setError('')
    if (!selectedCatalogId) {
      setError('Select a catalog package')
      return
    }
    const profitValue = parseFloat(profit)
    if (isNaN(profitValue) || profitValue < 0) {
      setError('Enter a valid profit (0 or more)')
      return
    }

    setPkgLoading(true)
    const { error: rpcError } = await supabase.rpc('add_store_package', {
      p_data_package_id: selectedCatalogId,
      p_profit: profitValue,
    } as { p_data_package_id: string; p_profit: number })
    setPkgLoading(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setShowForm(false)
    setSelectedCatalogId('')
    setProfit('')
    loadPackages()
    onMessage?.('Package added to your store!')
  }

  const handleUpdateProfit = async (pkg: StorePackage) => {
    const profitValue = parseFloat(editProfit)
    if (isNaN(profitValue) || profitValue < 0) {
      setError('Enter a valid profit (0 or more)')
      return
    }

    const { error: rpcError } = await supabase.rpc('update_store_package_profit', {
      p_store_package_id: pkg.id,
      p_profit: profitValue,
    } as { p_store_package_id: string; p_profit: number })

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setEditingId(null)
    setEditProfit('')
    setError('')
    loadPackages()
    onMessage?.('Profit updated')
  }

  const togglePackage = async (pkg: StorePackage) => {
    await supabase.from('store_packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id)
    loadPackages()
  }

  const deletePackage = async (id: string) => {
    if (!confirm('Remove this package from your store?')) return
    await supabase.from('store_packages').delete().eq('id', id)
    loadPackages()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2>Store Packages</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Pick packages from the admin catalog by network. Agent price is your cost — add profit for your customers.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => (showForm ? setShowForm(false) : openForm())}
          disabled={catalogLoading || availableCatalog.length === 0}
        >
          {showForm ? 'Cancel' : '+ Add Package'}
        </button>
      </div>

      {availableCatalog.length === 0 && !catalogLoading && packages.length > 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          All available catalog packages are already in your store.
        </p>
      )}

      {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {showForm && (
        <div className="store-pkg-form" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          {catalogLoading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading catalog...</p>
          ) : availableCatalog.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No catalog packages available to add.</p>
          ) : (
            <>
              <div className="form-grid">
                <div className="form-group">
                  <label>Network</label>
                  <select
                    className="form-input"
                    value={formNetwork}
                    onChange={(e) => handleFormNetworkChange(e.target.value as NetworkType)}
                  >
                    {NETWORK_ORDER.map((n) => (
                      <option key={n} value={n} disabled={!networksWithAvailability.includes(n)}>
                        {networkLabels[n]}
                        {!networksWithAvailability.includes(n) ? ' (all added)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Catalog Package</label>
                  <select
                    className="form-input"
                    value={selectedCatalogId}
                    onChange={(e) => setSelectedCatalogId(e.target.value)}
                    disabled={availableForNetwork.length === 0}
                  >
                    <option value="">
                      {availableForNetwork.length === 0
                        ? 'No packages left for this network'
                        : 'Select a package...'}
                    </option>
                    {availableForNetwork.map((p) => (
                      <option key={p.id} value={p.id}>
                        {catalogOptionLabel(p.size_gb, p.agent_price)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Your Profit (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={profit}
                    onChange={(e) => setProfit(e.target.value)}
                    placeholder="e.g. 2.00"
                  />
                </div>
              </div>

              {selectedCatalog && (
                <div style={{ marginBottom: '1rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  Network: <strong>{networkLabels[selectedCatalog.network]}</strong>
                  {' · '}
                  Base cost (agent price): <strong>{formatMoney(selectedCatalog.agent_price)}</strong>
                  {' · '}
                  Your profit: <strong>{formatMoney(profitNum)}</strong>
                  {' · '}
                  Customer pays: <strong style={{ color: 'var(--accent)' }}>{formatMoney(customerPrice)}</strong>
                  {' · '}
                  Validity: <strong>Non expiry</strong>
                </div>
              )}

              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleAdd} disabled={pkgLoading || !selectedCatalogId}>
                  {pkgLoading ? 'Adding...' : 'Add to Store'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading your packages...</p>
      ) : packages.length === 0 ? (
        <div className="empty-state">
          <p>No packages yet. Add catalog packages with your profit margin for customers to buy.</p>
        </div>
      ) : (
        <>
          {showPreview && activePackages.length > 0 && (
            <>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Preview — how packages appear on your mini store:
              </p>
              <NetworkSwitcher
                networks={activePackages.map((p) => p.network)}
                selected={previewNetwork}
                onChange={setPreviewNetwork}
                className="network-switcher-compact"
              />
              <div className="package-grid" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                {previewPackages.map((pkg) => (
                  <div key={pkg.id} className={`package-card ${networkCardClass(pkg.network)}`} style={{ cursor: 'default' }}>
                    <div className="package-size">{pkg.size_gb}</div>
                    <div className="package-unit">GB</div>
                    <div className="package-price">GHS {Number(pkg.price).toFixed(2)}</div>
                    <div className="package-validity">Non expiry</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {groupByNetwork(sortedPackages).map(({ network, packages: networkPackages }) => (
            <div key={network} style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>{network}</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Base (Agent)</th>
                    <th>Profit</th>
                    <th>Customer Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {networkPackages.map((pkg) => (
                    <tr key={pkg.id}>
                      <td>{pkg.size_gb} GB</td>
                      <td>{formatMoney(pkg.base_price)}</td>
                      <td>
                        {editingId === pkg.id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-input"
                            style={{ width: '6rem' }}
                            value={editProfit}
                            onChange={(e) => setEditProfit(e.target.value)}
                          />
                        ) : (
                          formatMoney(pkg.profit)
                        )}
                      </td>
                      <td>{formatMoney(pkg.price)}</td>
                      <td>
                        <span className={`status-badge ${pkg.is_active ? 'success' : 'pending'}`}>
                          {pkg.is_active ? 'Live' : 'Hidden'}
                        </span>
                      </td>
                      <td className="table-actions">
                        {editingId === pkg.id ? (
                          <>
                            <button className="btn btn-ghost" onClick={() => handleUpdateProfit(pkg)}>Save</button>
                            <button className="btn btn-ghost" onClick={() => { setEditingId(null); setEditProfit('') }}>Cancel</button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            onClick={() => { setEditingId(pkg.id); setEditProfit(String(pkg.profit)); setError('') }}
                          >
                            Edit Profit
                          </button>
                        )}
                        <button className="btn btn-ghost" onClick={() => togglePackage(pkg)}>
                          {pkg.is_active ? 'Hide' : 'Show'}
                        </button>
                        <button className="btn btn-ghost admin-danger" onClick={() => deletePackage(pkg.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </>
  )
}
