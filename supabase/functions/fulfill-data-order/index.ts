import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { fulfillSwiftDataOrder } from '../_shared/swiftdata.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return errorResponse('Missing authorization', 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return errorResponse('Unauthorized', 401)
    }

    const { transaction_id } = await req.json()
    if (!transaction_id) {
      return errorResponse('transaction_id required', 400)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: tx } = await admin
      .from('transactions')
      .select('user_id')
      .eq('id', transaction_id)
      .single()

    if (!tx) {
      return errorResponse('Transaction not found', 404)
    }

    if (tx.user_id !== user.id) {
      return errorResponse('Forbidden', 403)
    }

    const result = await fulfillSwiftDataOrder(admin, transaction_id)
    if (!result.success) {
      return jsonResponse({ success: false, error: result.error }, 400)
    }

    return jsonResponse({
      success: true,
      status: result.status ?? 'success',
      order_id: result.order_id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return errorResponse(message, 500)
  }
})
