import PageHeader from '../components/PageHeader'
import PackageGrid from '../components/PackageGrid'
import PricingNotice from '../components/PricingNotice'
import { usePackages } from '../hooks/usePackages'
import { useAuth } from '../context/AuthContext'

export default function BuyMtnDataPage() {
  const { refreshProfile } = useAuth()
  const { packages, loading, isAgent } = usePackages('mtn')

  return (
    <>
      <PageHeader
        title="Buy MTN Data"
        description="Select a data package and enter the recipient's phone number"
      />
      <PricingNotice isAgent={isAgent} />
      <PackageGrid
        packages={packages}
        network="mtn"
        cardClass="mtn"
        loading={loading}
        onPurchaseComplete={refreshProfile}
      />
    </>
  )
}
