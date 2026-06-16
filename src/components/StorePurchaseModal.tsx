import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getWhatsAppUrl } from '../lib/storeUtils'
import { CheckCircle, X } from './icons'

export interface PublicStorePackage {
  id: string
  network: string
  size_gb: number
  price: number
  validity?: string
}

interface StorePurchaseModalProps {
  pkg: PublicStorePackage | null
  storeSlug: string
  storeName: string
  whatsapp: string
  onClose: () => void
}

export default function StorePurchaseModal({
  pkg,
  storeSlug,
  storeName,
  whatsapp,
  onClose,
}: StorePurchaseModalProps) {
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!pkg) return null

  const handleOrder = async () => {
    setError('')
    const cleaned = phone.replace(/\s/g, '')
    if (!/^(0[235]\d{8}|233[235]\d{8})$/.test(cleaned)) {
      setError('Enter a valid Ghana phone number (e.g. 0244123456)')
      return
    }

    setLoading(true)
    const { error: rpcError } = await supabase.rpc('place_store_order', {
      p_slug: storeSlug,
      p_package_id: pkg.id,
      p_customer_phone: cleaned,
    } as { p_slug: string; p_package_id: string; p_customer_phone: string })
    setLoading(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setStep('success')
  }

  const handleClose = () => {
    setPhone('')
    setStep('form')
    setError('')
    onClose()
  }

  const whatsappMessage = `Hi ${storeName}, I just placed an order for ${pkg.network} ${pkg.size_gb}GB (GHS ${Number(pkg.price).toFixed(2)}) to be sent to ${phone.replace(/\s/g, '')}.`

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {step === 'form' ? (
          <>
            <div className="modal-header">
              <h2>Buy Data</h2>
              <button className="modal-close" onClick={handleClose} aria-label="Close">
                <X />
              </button>
            </div>

            <div className="modal-summary">
              <div className="modal-summary-row">
                <span className="label">Network</span>
                <span className="value">{pkg.network}</span>
              </div>
              <div className="modal-summary-row">
                <span className="label">Data</span>
                <span className="value">{pkg.size_gb} GB</span>
              </div>
              <div className="modal-summary-row">
                <span className="label">Validity</span>
                <span className="value">{pkg.validity ?? 'Non expiry'}</span>
              </div>
              <div className="modal-summary-row total">
                <span className="label">Price</span>
                <span className="value">GHS {Number(pkg.price).toFixed(2)}</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="store-phone">Your Phone Number</label>
              <input
                id="store-phone"
                type="tel"
                className="form-input"
                placeholder="e.g. 0244123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {error && <div className="auth-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleOrder} disabled={loading}>
                {loading ? 'Placing order...' : 'Place Order'}
              </button>
            </div>
          </>
        ) : (
          <div className="modal-success">
            <CheckCircle />
            <h3>Order Placed!</h3>
            <p>
              Your order for {pkg.size_gb}GB {pkg.network} has been submitted.
              Contact the store on WhatsApp to complete payment and delivery.
            </p>
            <a
              href={getWhatsAppUrl(whatsapp, whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ marginTop: '1rem', width: '100%', display: 'inline-flex' }}
            >
              Chat on WhatsApp
            </a>
            <button
              className="btn btn-secondary"
              style={{ marginTop: '0.75rem', width: '100%' }}
              onClick={handleClose}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
