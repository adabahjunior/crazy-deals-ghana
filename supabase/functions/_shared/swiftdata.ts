import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export function networkLabel(network: string): string {
  switch (network) {
    case 'mtn': return 'MTN'
    case 'telecel': return 'Telecel'
    case 'airtel-ishare': return 'AirtelTigo iShare'
    case 'airtel-bigtime': return 'AirtelTigo BigTime'
    default: return network
  }
}

export function packageSize(sizeGb: number): string {
  if (Number.isInteger(sizeGb)) return `${sizeGb}GB`
  return `${sizeGb}GB`
}

export async function fulfillSwiftDataOrder(
  admin: SupabaseClient,
  transactionId: string
): Promise<{ success: boolean; status?: string; order_id?: string; error?: string }> {
  const { data: tx, error: txError } = await admin
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (txError || !tx) {
    return { success: false, error: 'Transaction not found' }
  }

  if (tx.status === 'success') {
    return { success: true, status: 'success', order_id: tx.provider_order_id ?? undefined }
  }

  if (tx.status === 'failed') {
    return { success: false, error: tx.provider_error ?? 'Already failed' }
  }

  const { data: settings } = await admin
    .from('site_settings')
    .select('key, value')
    .in('key', ['swiftdata_enabled', 'swiftdata_api_key', 'swiftdata_api_url'])

  const config = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]))

  if (config.swiftdata_enabled !== 'true') {
    await admin.from('transactions').update({ status: 'success' }).eq('id', transactionId)
    return { success: true, status: 'success' }
  }

  const apiKey = config.swiftdata_api_key?.trim()
  const apiUrl = config.swiftdata_api_url?.trim() ||
    'https://lsocdjpflecduumopijn.supabase.co/functions/v1/developer-api/buy'

  if (!apiKey) {
    await admin.rpc('refund_failed_purchase', {
      p_tx_id: transactionId,
      p_error: 'SwiftData API key not configured',
    })
    return { success: false, error: 'SwiftData API key not configured' }
  }

  const { data: pkg, error: pkgError } = await admin
    .from('data_packages')
    .select('network, size_gb')
    .eq('id', tx.package_id)
    .single()

  if (pkgError || !pkg) {
    await admin.rpc('refund_failed_purchase', { p_tx_id: transactionId, p_error: 'Package not found' })
    return { success: false, error: 'Package not found' }
  }

  const body = {
    network: networkLabel(pkg.network),
    phone: tx.phone,
    package_size: packageSize(Number(pkg.size_gb)),
    request_id: transactionId,
  }

  const swiftRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const swiftData = await swiftRes.json().catch(() => ({}))

  if (!swiftRes.ok || !swiftData.success) {
    const errMsg = swiftData.error ?? swiftData.message ?? `SwiftData HTTP ${swiftRes.status}`
    await admin.rpc('refund_failed_purchase', { p_tx_id: transactionId, p_error: errMsg })
    return { success: false, error: errMsg }
  }

  const providerStatus = swiftData.status ?? 'pending'
  const failed = ['failed', 'failure', 'cancelled'].includes(providerStatus)

  if (failed) {
    const errMsg = swiftData.error ?? 'SwiftData fulfillment failed'
    await admin.rpc('refund_failed_purchase', { p_tx_id: transactionId, p_error: errMsg })
    return { success: false, error: errMsg }
  }

  await admin.from('transactions').update({
    status: 'success',
    provider_order_id: swiftData.order_id ?? null,
    provider_status: providerStatus,
    provider_error: null,
  }).eq('id', transactionId)

  return {
    success: true,
    status: 'success',
    order_id: swiftData.order_id,
  }
}
