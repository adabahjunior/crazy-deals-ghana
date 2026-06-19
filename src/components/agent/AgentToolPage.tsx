import type { ReactNode } from 'react'

interface AgentToolPageProps {
  title: string
  description: string
  badge?: string
  children?: ReactNode
}

export default function AgentToolPage({ title, description, badge, children }: AgentToolPageProps) {
  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>{title} {badge && <span className="dm-nav-badge">{badge}</span>}</h1>
          <p>{description}</p>
        </div>
      </div>
      {children ?? (
        <div className="content-card">
          <div className="empty-state">
            <p>This feature matches the DataMart agent dashboard UI and will be connected to backend services in a future update.</p>
          </div>
        </div>
      )}
    </>
  )
}
