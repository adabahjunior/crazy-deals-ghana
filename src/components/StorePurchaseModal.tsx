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

interface PromoValidation {
  valid: boolean
  message: string
  original_amount?: number
  final_amount?: number
  promo_label?: string
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
  const [promoCode, setPromoCode] = useState('')
  const [promo, setPromo] = useState<PromoValidation | null>(null)
  const [validatingPromo, setValidatingPromo] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPromoOrder, setIsPromoOrder] = useState(false)

  if (!pkg) return null

  const displayPrice = promo?.valid ? Number(promo.final_amount ?? 0) : Number(pkg.price)

  const applyPromo = async () => {
    setError('')
    setPromo(null)
    const code = promoCode.trim()
    if (!code) return

    setValidatingPromo(true)
    const { data, error: rpcError } = await supabase.rpc('validate_promo_code', {
      p_slug: storeSlug,
      p_code: code,
      p_package_id: pkg.id,
    })
    setValidatingPromo(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    const result = data as PromoValidation
    setPromo(result)
    if (!result.valid) {
      setError(result.message)
    } else {
      setError('')
    }
  }

  const clearPromo = () => {
    setPromoCode('')
    setPromo(null)
    setError('')
  }

  const handleOrder = async () => {
    setError('')
    const cleaned = phone.replace(/\s/g, '')
    if (!/^(0[235]\d{8}|233[235]\d{8})$/.test(cleaned)) {
      setError('Enter a valid Ghana phone number (e.g. 0244123456)')
      return
    }

    if (promoCode.trim() && !promo?.valid) {
      setError('Apply a valid promo code or remove it before placing your order')
      return
    }

    setLoading(true)
    const { error: rpcError } = await supabase.rpc('place_store_order', {
      p_slug: storeSlug,
      p_package_id: pkg.id,
      p_customer_phone: cleaned,
      p_promo_code: promo?.valid ? promoCode.trim() : null,
    })
    setLoading(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setIsPromoOrder(!!promo?.valid)
    setStep('success')
  }

  const handleClose = () => {
    setPhone('')
    setPromoCode('')
    setPromo(null)
    setStep('form')
    setError('')
    setIsPromoOrder(false)
    onClose()
  }

  const whatsappMessage = isPromoOrder
    ? `Hi ${storeName}, I redeemed promo code ${promoCode.trim().toUpperCase()} for ${pkg.network} ${pkg.size_gb}GB to ${phone.replace(/\s/g, '')}.`
    : `Hi ${storeName}, I just placed an order for ${pkg.network} ${pkg.size_gb}GB (GHS ${displayPrice.toFixed(2)}) to be sent to ${phone.replace(/\s/g, '')}.`

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
              {promo?.valid && (
                <div className="modal-summary-row">
                  <span className="label">Promo</span>
                  <span className="value" style={{ color: '#4ade80' }}>{promo.promo_label}</span>
                </div>
              )}
              <div className="modal-summary-row total">
                <span className="label">Price</span>
                <span className="value">
                  {promo?.valid && displayPrice === 0 ? (
                    <span style={{ color: '#4ade80' }}>FREE</span>
                  ) : (
                    <>GHS {displayPrice.toFixed(2)}</>
                  )}
                </span>
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

            <div className="form-group">
              <label htmlFor="store-promo">Promo Code (optional)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="store-promo"
                  type="text"
                  className="form-input"
                  placeholder="e.g. CD-A1B2C3"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase())
                    setPromo(null)
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={applyPromo}
                  disabled={validatingPromo || !promoCode.trim()}
                >
                  {validatingPromo ? '...' : 'Apply'}
                </button>
              </div>
              {promo?.valid && (
                <p style={{ color: '#4ade80', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  {promo.message}{' '}
                  <button type="button" className="btn btn-ghost" style={{ padding: 0 }} onClick={clearPromo}>
                    Remove
                  </button>
                </p>
              )}
            </div>

            {error && <div className="auth-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleOrder} disabled={loading}>
                {loading ? 'Placing order...' : promo?.valid ? 'Redeem Free Data' : 'Place Order'}
              </button>
            </div>
          </>
        ) : (
          <div className="modal-success">
            <CheckCircle />
            <h3>{isPromoOrder ? 'Promo Redeemed!' : 'Order Placed!'}</h3>
            <p>
              {isPromoOrder
                ? `Your free ${pkg.size_gb}GB ${pkg.network} bundle has been submitted for ${phone.replace(/\s/g, '')}.`
                : `Your order for ${pkg.size_gb}GB ${pkg.network} has been submitted.`}
              {' '}Contact the store on WhatsApp to complete payment and delivery.
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
