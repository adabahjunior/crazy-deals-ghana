import AgentStorePackageManager from '../components/AgentStorePackageManager'

export default function StorePackagesPage() {
  return (
    <>
      <div className="dm-page-head">
        <div>
          <h1>Products</h1>
          <p>Manage packages and pricing for your store</p>
        </div>
      </div>

      <div className="content-card">
        <AgentStorePackageManager showPreview={false} />
      </div>
    </>
  )
}
