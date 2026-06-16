import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import type { DataPackage, NetworkType } from '../../types/database'
import { networkLabels } from '../../types/database'
import { groupByNetwork, sortByNetworkAndSize } from '../../lib/networkOrder'

const networks: NetworkType[] = ['mtn', 'airtel-ishare', 'airtel-bigtime', 'telecel']

const emptyForm = {
  network: 'mtn' as NetworkType,
  size_gb: '',
  user_price: '',
  agent_price: '',
  sort_order: '0',
  is_active: true,
}

const PACKAGE_VALIDITY = 'Non expiry'

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<DataPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DataPackage | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => {
    const { data } = await supabase
      .from('data_packages')
      .select('*')
    setPackages(sortByNetworkAndSize(data ?? []))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
    setError('')
  }

  const openEdit = (pkg: DataPackage) => {
    setEditing(pkg)
    setForm({
      network: pkg.network,
      size_gb: String(pkg.size_gb),
      user_price: String(pkg.user_price),
      agent_price: String(pkg.agent_price),
      sort_order: String(pkg.sort_order),
      is_active: pkg.is_active,
    })
    setShowForm(true)
    setError('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const payload = {
      network: form.network,
      size_gb: parseFloat(form.size_gb),
      user_price: parseFloat(form.user_price),
      agent_price: parseFloat(form.agent_price),
      validity: PACKAGE_VALIDITY,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
    }

    if (editing) {
      const { error: updateError } = await supabase
        .from('data_packages')
        .update(payload)
        .eq('id', editing.id)
      if (updateError) { setError(updateError.message); return }
      setMessage('Package updated')
    } else {
      const { error: insertError } = await supabase.from('data_packages').insert(payload)
      if (insertError) { setError(insertError.message); return }
      setMessage('Package created')
    }

    setEditing(null)
    setForm(emptyForm)
    setShowForm(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this package?')) return
    await supabase.from('data_packages').delete().eq('id', id)
    load()
  }

  const toggleActive = async (pkg: DataPackage) => {
    await supabase.from('data_packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id)
    load()
  }

  const groupedPackages = groupByNetwork(packages)

  return (
    <>
      <PageHeader
        title="Data Packages"
        description="Set separate prices for Users (no store) and Agents (with store)"
      />

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          <strong>Users</strong> buy at user prices. <strong>Agents</strong> (people with a published store) buy at lower agent prices.
        </p>
      </div>

      <div className="form-actions" style={{ marginBottom: '1.5rem' }}>
        <button className="btn btn-primary" onClick={openCreate}>Add Package</button>
      </div>

      {(showForm || editing) && (
        <div className="content-card" style={{ marginBottom: '1.5rem' }}>
          <h2>{editing ? 'Edit Package' : 'New Package'}</h2>
          {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}
          {message && <div className="admin-success" style={{ marginBottom: '1rem' }}>{message}</div>}
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-group">
                <label>Network</label>
                <select className="form-input" value={form.network}
                  onChange={(e) => setForm({ ...form, network: e.target.value as NetworkType })}>
                  {networks.map((n) => (
                    <option key={n} value={n}>{networkLabels[n]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Size (GB)</label>
                <input type="number" step="0.1" className="form-input" required
                  value={form.size_gb} onChange={(e) => setForm({ ...form, size_gb: e.target.value })} />
              </div>
              <div className="form-group">
                <label>User Price (GHS)</label>
                <input type="number" step="0.01" className="form-input" required
                  value={form.user_price} onChange={(e) => setForm({ ...form, user_price: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Agent Price (GHS)</label>
                <input type="number" step="0.01" className="form-input" required
                  value={form.agent_price} onChange={(e) => setForm({ ...form, agent_price: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Validity</label>
                <input type="text" className="form-input" value={PACKAGE_VALIDITY} readOnly disabled />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input type="number" className="form-input"
                  value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-input" value={form.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save Package</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(false) }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="content-card">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : packages.length === 0 ? (
          <div className="empty-state"><p>No packages yet.</p></div>
        ) : (
          groupedPackages.map(({ network, packages: networkPackages }) => (
            <div key={network} className="admin-network-section">
              <h2 className="admin-network-heading">{networkLabels[network as NetworkType] ?? network}</h2>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Size</th>
                      <th>User Price</th>
                      <th>Agent Price</th>
                      <th>Validity</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networkPackages.map((pkg) => (
                      <tr key={pkg.id}>
                        <td>{pkg.size_gb} GB</td>
                        <td>GHS {Number(pkg.user_price).toFixed(2)}</td>
                        <td>GHS {Number(pkg.agent_price).toFixed(2)}</td>
                        <td>{PACKAGE_VALIDITY}</td>
                        <td>
                          <span className={`status-badge ${pkg.is_active ? 'success' : 'pending'}`}>
                            {pkg.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="table-actions">
                          <button className="btn btn-ghost" onClick={() => openEdit(pkg)}>Edit</button>
                          <button className="btn btn-ghost" onClick={() => toggleActive(pkg)}>
                            {pkg.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button className="btn btn-ghost admin-danger" onClick={() => handleDelete(pkg.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
