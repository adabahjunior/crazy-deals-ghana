import PageHeader from '../components/PageHeader'
import PackageGrid from '../components/PackageGrid'
import PricingNotice from '../components/PricingNotice'
import { usePackages } from '../hooks/usePackages'
import { useAuth } from '../context/AuthContext'

export default function BuyTelecelDataPage() {
  const { refreshProfile } = useAuth()
  const { packages, loading, isAgent } = usePackages('telecel')

  return (
    <>
      <PageHeader
        title="Buy Telecel Data"
        description="Select a Telecel data package for your recipient"
      />
      <PricingNotice isAgent={isAgent} />
      <PackageGrid
        packages={packages}
        network="telecel"
        cardClass="telecel"
        loading={loading}
        onPurchaseComplete={refreshProfile}
      />
    </>
  )
}
