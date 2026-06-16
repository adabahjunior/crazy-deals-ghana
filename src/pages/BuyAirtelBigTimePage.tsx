import PageHeader from '../components/PageHeader'
import PackageGrid from '../components/PackageGrid'
import PricingNotice from '../components/PricingNotice'
import { usePackages } from '../hooks/usePackages'
import { useAuth } from '../context/AuthContext'

export default function BuyAirtelBigTimePage() {
  const { refreshProfile } = useAuth()
  const { packages, loading, isAgent } = usePackages('airtel-bigtime')

  return (
    <>
      <PageHeader
        title="Buy Airtel-Tigo BigTime Data"
        description="Select a BigTime data package for AirtelTigo numbers"
      />
      <PricingNotice isAgent={isAgent} />
      <PackageGrid
        packages={packages}
        network="airtel-bigtime"
        cardClass="airtel"
        loading={loading}
        onPurchaseComplete={refreshProfile}
      />
    </>
  )
}
