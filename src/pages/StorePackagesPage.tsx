import PageHeader from '../components/PageHeader'
import AgentStorePackageManager from '../components/AgentStorePackageManager'

export default function StorePackagesPage() {
  return (
    <>
      <PageHeader
        title="Store Packages"
        description="Add catalog packages with your profit margin for customers on your mini store"
      />

      <div className="content-card">
        <AgentStorePackageManager showPreview={false} />
      </div>
    </>
  )
}
