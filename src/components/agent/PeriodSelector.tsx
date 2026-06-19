export type DashboardPeriod = 'today' | 'week' | 'month' | 'all'

const labels: Record<DashboardPeriod, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
}

interface PeriodSelectorProps {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="dm-period-tabs">
      {(Object.keys(labels) as DashboardPeriod[]).map((period) => (
        <button
          key={period}
          type="button"
          className={`dm-period-tab ${value === period ? 'active' : ''}`}
          onClick={() => onChange(period)}
        >
          {labels[period]}
        </button>
      ))}
    </div>
  )
}
