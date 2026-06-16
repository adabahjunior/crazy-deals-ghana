import PageHeader from '../components/PageHeader'
import PackageGrid from '../components/PackageGrid'
import PricingNotice from '../components/PricingNotice'
import { usePackages } from '../hooks/usePackages'
import { useAuth } from '../context/AuthContext'

export default function BuyAirtelIsharePage() {
  const { refreshProfile } = useAuth()
  const { packages, loading, isAgent } = usePackages('airtel-ishare')

  return (
    <>
      <PageHeader
        title="Buy Airtel-Tigo iShare Data"
        description="Select an iShare data package for AirtelTigo numbers"
      />
      <PricingNotice isAgent={isAgent} />
      <PackageGrid
        packages={packages}
        network="airtel-ishare"
        cardClass="airtel"
        loading={loading}
        onPurchaseComplete={refreshProfile}
      />
    </>
  )
}
