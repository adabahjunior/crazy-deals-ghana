import PageHeader from '../components/PageHeader'

const services = [
  { name: 'Result Checker', description: 'WAEC & BECE result checker pins', price: 'From GHS 18' },
  { name: 'Airtime Top Up', description: 'Instant airtime for all networks', price: 'Any amount' },
  { name: 'Bill Payment', description: 'ECG, Ghana Water & TV subscriptions', price: 'Varies' },
  { name: 'Bulk SMS', description: 'Send SMS to multiple recipients', price: 'From GHS 0.03/SMS' },
]

export default function ExtraServicesPage() {
  return (
    <>
      <PageHeader
        title="Extra Services"
        description="Additional services available on CrazyDeals Ghana"
      />

      <div className="quick-actions">
        {services.map((service) => (
          <div key={service.name} className="quick-action" style={{ cursor: 'pointer' }}>
            <div>
              <div className="quick-action-text">{service.name}</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {service.description}
              </p>
              <p style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.5rem' }}>
                {service.price}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
