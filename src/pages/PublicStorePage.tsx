import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { networkCardClass } from '../lib/storeUtils'
import { groupByNetwork } from '../lib/networkOrder'
import NetworkSwitcher, { defaultNetworkSelection } from '../components/NetworkSwitcher'
import StorePurchaseModal, { type PublicStorePackage } from '../components/StorePurchaseModal'

interface PublicStore {
  store_name: string
  whatsapp: string
  slug: string
  packages: PublicStorePackage[]
}

export default function PublicStorePage() {
  const { slug } = useParams<{ slug: string }>()
  const [store, setStore] = useState<PublicStore | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selected, setSelected] = useState<PublicStorePackage | null>(null)
  const [activeNetwork, setActiveNetwork] = useState('')

  useEffect(() => {
    if (!slug) return

    supabase
      .rpc('get_public_store', { p_slug: slug } as { p_slug: string })
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          setStore(data as PublicStore)
        }
        setLoading(false)
      })
  }, [slug])

  const packageGroups = useMemo(
    () => (store ? groupByNetwork(store.packages) : []),
    [store]
  )

  useEffect(() => {
    if (packageGroups.length === 0) {
      setActiveNetwork('')
      return
    }
    const keys = packageGroups.map((g) => g.network)
    if (!activeNetwork || !keys.includes(activeNetwork)) {
      setActiveNetwork(defaultNetworkSelection(keys))
    }
  }, [packageGroups, activeNetwork])

  const visiblePackages = packageGroups.find((g) => g.network === activeNetwork)?.packages ?? []

  if (loading) {
    return (
      <div className="public-store-page">
        <div className="public-store-loading">Loading store...</div>
      </div>
    )
  }

  if (notFound || !store) {
    return (
      <div className="public-store-page">
        <div className="public-store-not-found">
          <h1>Store Not Found</h1>
          <p>This store does not exist or is not published yet.</p>
          <Link to="/" className="btn btn-primary">Go to CrazyDeals Ghana</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="public-store-page">
      <header className="public-store-header">
        <div className="public-store-header-inner">
          <h1>{store.store_name}</h1>
          <p>Affordable data bundles — powered by CrazyDeals Ghana</p>
          <a
            href={`https://wa.me/233${store.whatsapp.slice(1)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary public-store-whatsapp"
          >
            WhatsApp Support: {store.whatsapp}
          </a>
        </div>
      </header>

      <main className="public-store-main">
        {store.packages.length === 0 ? (
          <div className="empty-state">
            <p>No packages available yet. Check back soon!</p>
          </div>
        ) : (
          <>
            <NetworkSwitcher
              networks={store.packages.map((p) => p.network)}
              selected={activeNetwork}
              onChange={setActiveNetwork}
            />

            <section className="public-store-section">
              <h2>{activeNetwork}</h2>
              {visiblePackages.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No packages for this network.</p>
              ) : (
                <div className="package-grid">
                  {visiblePackages.map((pkg) => (
                    <button
                      key={pkg.id}
                      className={`package-card ${networkCardClass(pkg.network)}`}
                      onClick={() => setSelected(pkg)}
                    >
                      <div className="package-size">{pkg.size_gb}</div>
                      <div className="package-unit">GB</div>
                      <div className="package-price">GHS {Number(pkg.price).toFixed(2)}</div>
                      <div className="package-validity">{pkg.validity ?? 'Non expiry'}</div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="public-store-footer">
        <p>© {store.store_name} · <Link to="/">CrazyDeals Ghana</Link></p>
      </footer>

      <StorePurchaseModal
        pkg={selected}
        storeSlug={store.slug}
        storeName={store.store_name}
        whatsapp={store.whatsapp}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
