import { useState } from 'react'
import type { DataPackage, NetworkType } from '../types/database'
import PurchaseModal from './PurchaseModal'

interface PackageGridProps {
  packages: DataPackage[]
  network: NetworkType
  cardClass: 'mtn' | 'airtel' | 'telecel'
  loading?: boolean
  onPurchaseComplete?: () => void
}

export default function PackageGrid({
  packages,
  network,
  cardClass,
  loading,
  onPurchaseComplete,
}: PackageGridProps) {
  const [selected, setSelected] = useState<DataPackage | null>(null)

  if (loading) {
    return <div className="empty-state"><p>Loading packages...</p></div>
  }

  if (packages.length === 0) {
    return <div className="empty-state"><p>No packages available right now.</p></div>
  }

  return (
    <>
      <div className="package-grid">
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            className={`package-card ${cardClass}`}
            onClick={() => setSelected(pkg)}
          >
            <div className="package-size">{pkg.size_gb}</div>
            <div className="package-unit">GB</div>
            <div className="package-price">GHS {Number(pkg.price).toFixed(2)}</div>
            <div className="package-validity">{pkg.validity}</div>
          </button>
        ))}
      </div>

      <PurchaseModal
        pkg={selected}
        network={network}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          onPurchaseComplete?.()
        }}
      />
    </>
  )
}
