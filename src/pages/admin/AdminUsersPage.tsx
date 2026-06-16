import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import type { Profile } from '../../types/database'
import { accountTypeLabel } from '../../lib/pricing'
import { formatMoney, formatDate } from '../../hooks/useTransactions'

interface UserWithStats extends Profile {
  order_count: number
  total_spent: number
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const { data: txStats } = await supabase
      .from('transactions')
      .select('user_id, amount, status')
      .eq('type', 'data_purchase')

    const statsMap = new Map<string, { count: number; spent: number }>()
    for (const tx of txStats ?? []) {
      const cur = statsMap.get(tx.user_id) ?? { count: 0, spent: 0 }
      cur.count += 1
      if (tx.status === 'success') cur.spent += Number(tx.amount)
      statsMap.set(tx.user_id, cur)
    }

    setUsers(
      (profiles ?? []).map((p) => ({
        ...p,
        order_count: statsMap.get(p.id)?.count ?? 0,
        total_spent: statsMap.get(p.id)?.spent ?? 0,
      }))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.store_name?.toLowerCase().includes(q)
    )
  })

  const toggleAdmin = async (user: Profile, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: !user.is_admin, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setMessage(`${user.full_name ?? user.email} is now ${user.is_admin ? 'a regular user' : 'an admin'}`)
    load()
  }

  return (
    <>
      <PageHeader title="Users & Agents" description="Tap a user to view their account, transactions, store, and credit their wallet." />

      {message && <div className="admin-success" style={{ marginBottom: '1rem' }}>{message}</div>}
      {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="label">Total Accounts</div>
          <div className="value accent">{users.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Agents</div>
          <div className="value">{users.filter((u) => u.store_published).length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Users</div>
          <div className="value">{users.filter((u) => !u.store_published).length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Admins</div>
          <div className="value">{users.filter((u) => u.is_admin).length}</div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label>Search Users</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email, phone, or store name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="content-card">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading users...</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Wallet</th>
                  <th>Orders</th>
                  <th>Spent</th>
                  <th>Store</th>
                  <th>Account Type</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="admin-user-row"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <Link
                        to={`/admin/users/${user.id}`}
                        className="admin-user-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {user.full_name ?? '-'}
                      </Link>
                    </td>
                    <td>{user.email ?? '-'}</td>
                    <td>{user.phone ?? '-'}</td>
                    <td>{formatMoney(user.wallet_balance)}</td>
                    <td>{user.order_count}</td>
                    <td>{formatMoney(user.total_spent)}</td>
                    <td>
                      {user.store_published ? (
                        <span className="status-badge success">{user.store_name ?? 'Live'}</span>
                      ) : (
                        <span className="status-badge pending">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${user.store_published ? 'success' : 'info'}`}>
                        {accountTypeLabel(user.store_published)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_admin ? 'alert' : 'pending'}`}>
                        {user.is_admin ? 'Admin' : '—'}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td className="table-actions" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/admin/users/${user.id}`} className="btn btn-ghost">
                        View
                      </Link>
                      <button className="btn btn-ghost" onClick={(e) => toggleAdmin(user, e)}>
                        {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
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
