import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  accent?: boolean
}

export default function StatCard({ label, value, hint, icon, accent }: StatCardProps) {
  return (
    <div className="dm-stat-card">
      <div className="dm-stat-card-top">
        <span className="dm-stat-label">{label}</span>
        {icon && <div className="dm-stat-icon">{icon}</div>}
      </div>
      <div className={`dm-stat-value ${accent ? 'accent' : ''}`}>{value}</div>
      {hint && <div className="dm-stat-hint">{hint}</div>}
    </div>
  )
}
