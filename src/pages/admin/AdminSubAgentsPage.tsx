import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import { formatDate, formatMoney } from '../../hooks/useTransactions'
import type { Profile } from '../../types/database'

interface SubAgentRow extends Profile {
  parent_name: string | null
}

export default function AdminSubAgentsPage() {
  const [rows, setRows] = useState<SubAgentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: subAgents } = await supabase
        .from('profiles')
        .select('*')
        .not('parent_agent_id', 'is', null)
        .order('created_at', { ascending: false })

      const parentIds = [...new Set((subAgents ?? []).map((a) => a.parent_agent_id).filter(Boolean))]
      const { data: parents } = parentIds.length
        ? await supabase.from('profiles').select('id, full_name, store_name').in('id', parentIds)
        : { data: [] }

      const parentMap = new Map((parents ?? []).map((p) => [p.id, p.full_name ?? p.store_name]))

      setRows(
        (subAgents ?? []).map((a) => ({
          ...a,
          parent_name: a.parent_agent_id ? parentMap.get(a.parent_agent_id) ?? null : null,
        }))
      )
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <PageHeader title="Sub-Agents" description="Agent teams and parent-child relationships" />

      <div className="content-card">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No sub-agents registered yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sub-Agent</th>
                  <th>Parent Agent</th>
                  <th>Commission</th>
                  <th>Store Balance</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.full_name ?? row.email ?? '—'}</td>
                    <td>{row.parent_name ?? '—'}</td>
                    <td>{row.sub_agent_commission_pct}%</td>
                    <td>{formatMoney(row.store_balance)}</td>
                    <td>{formatDate(row.created_at)}</td>
                    <td>
                      <Link to={`/admin/users/${row.id}`} className="btn btn-ghost">View User</Link>
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
