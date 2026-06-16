import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DataPackage, NetworkType } from '../types/database'
import { networkLabels } from '../types/database'
import { useAuth } from '../context/AuthContext'
import { fulfillDataOrder, waitForTransaction } from '../lib/fulfillment'
import { CheckCircle, X } from './icons'

interface PurchaseModalProps {
  pkg: DataPackage | null
  network: NetworkType
  onClose: () => void
  onSuccess?: () => void
}

export default function PurchaseModal({ pkg, network, onClose, onSuccess }: PurchaseModalProps) {
  const { refreshProfile } = useAuth()
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Processing...')
  const [error, setError] = useState('')

  if (!pkg) return null

  const validatePhone = (num: string) => {
    const cleaned = num.replace(/\s/g, '')
    return /^(0[235]\d{8}|233[235]\d{8})$/.test(cleaned)
  }

  const handlePay = async () => {
    setError('')
    if (!validatePhone(phone)) {
      setError('Enter a valid Ghana phone number (e.g. 0244123456)')
      return
    }

    setLoading(true)
    setLoadingMessage('Processing payment...')

    const { data: txId, error: rpcError } = await supabase.rpc('purchase_data_package', {
      p_package_id: pkg.id,
      p_phone: phone.replace(/\s/g, ''),
    } as { p_package_id: string; p_phone: string })

    if (rpcError) {
      setLoading(false)
      setError(rpcError.message)
      return
    }

    if (txId) {
      setLoadingMessage('Sending data via SwiftData...')
      const fulfill = await fulfillDataOrder(txId as string)
      if (!fulfill.success) {
        setLoading(false)
        setError(fulfill.error ?? 'Data delivery failed. Your wallet has been refunded.')
        await refreshProfile()
        return
      }

      const result = await waitForTransaction(txId as string, 5, 1000)
      setLoading(false)

      if (result.status === 'failed') {
        setError(result.error ?? 'Data delivery failed. Your wallet has been refunded.')
        await refreshProfile()
        return
      }

      if (result.status === 'processing') {
        setError(result.error ?? 'Order is processing. Check Transaction History for updates.')
        await refreshProfile()
        return
      }
    } else {
      setLoading(false)
    }

    await refreshProfile()
    setStep('success')
    onSuccess?.()
  }

  const handleClose = () => {
    setPhone('')
    setStep('form')
    setError('')
    setLoadingMessage('Processing...')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {step === 'form' ? (
          <>
            <div className="modal-header">
              <h2>Confirm Purchase</h2>
              <button className="modal-close" onClick={handleClose} aria-label="Close">
                <X />
              </button>
            </div>

            <div className="modal-summary">
              <div className="modal-summary-row">
                <span className="label">Network</span>
                <span className="value">{networkLabels[network]}</span>
              </div>
              <div className="modal-summary-row">
                <span className="label">Data</span>
                <span className="value">{pkg.size_gb} GB</span>
              </div>
              <div className="modal-summary-row">
                <span className="label">Validity</span>
                <span className="value">{pkg.validity}</span>
              </div>
              <div className="modal-summary-row total">
                <span className="label">Total</span>
                <span className="value">GHS {Number(pkg.price).toFixed(2)}</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Recipient Phone Number</label>
              <input
                id="phone"
                type="tel"
                className="form-input"
                placeholder="e.g. 0244123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <div className="auth-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handlePay} disabled={loading}>
                {loading ? loadingMessage : 'Confirm & Pay'}
              </button>
            </div>
          </>
        ) : (
          <div className="modal-success">
            <CheckCircle />
            <h3>Order Submitted!</h3>
            <p>
              {pkg.size_gb} GB {networkLabels[network]} data is being delivered to {phone}.
            </p>
            <button className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={handleClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
