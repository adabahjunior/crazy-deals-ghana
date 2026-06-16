interface PricingNoticeProps {
  isAgent: boolean
}

export default function PricingNotice({ isAgent }: PricingNoticeProps) {
  return (
    <div className="content-card" style={{ marginBottom: '1.5rem' }}>
      <span className={`status-badge ${isAgent ? 'success' : 'info'}`}>
        {isAgent ? 'Agent pricing' : 'User pricing'}
      </span>
      <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', marginBottom: 0, fontSize: '0.95rem' }}>
        {isAgent
          ? 'You have a store, so you buy at lower agent rates.'
          : 'Create a store from My Store to become an Agent and unlock agent rates.'}
      </p>
    </div>
  )
}
