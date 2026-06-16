import { supabase } from './supabase'

export async function fulfillDataOrder(transactionId: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('fulfill-data-order', {
    body: { transaction_id: transactionId },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (data?.success === false) {
    return { success: false, error: data.error ?? 'Fulfillment failed' }
  }

  return { success: true }
}

export async function waitForTransaction(
  transactionId: string,
  maxAttempts = 15,
  intervalMs = 2000
): Promise<{ status: 'success' | 'failed' | 'processing'; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data, error } = await supabase
      .from('transactions')
      .select('status, provider_error')
      .eq('id', transactionId)
      .single()

    if (error) {
      return { status: 'failed', error: error.message }
    }

    if (data.status === 'success') {
      return { status: 'success' }
    }

    if (data.status === 'failed') {
      return {
        status: 'failed',
        error: data.provider_error ?? 'Data delivery failed. Your wallet has been refunded.',
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  return {
    status: 'processing',
    error: 'Order is still processing. Check Transaction History for updates.',
  }
}
