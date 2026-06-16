import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { fulfillSwiftDataOrder, networkLabel, packageSize } from '../_shared/swiftdata.ts'

const API_VERSION = '1.0.0'

interface ProfileRow {
  id: string
  wallet_balance: number
  store_balance: number
  store_published: boolean
  full_name: string | null
  email: string | null
}

function getRoute(pathname: string): string {
  const markers = ['/developer-api', '/api/v1']
  for (const marker of markers) {
    const idx = pathname.indexOf(marker)
    if (idx >= 0) {
      const route = pathname.slice(idx + marker.length) || '/'
      return route.startsWith('/') ? route : `/${route}`
    }
  }
  return pathname || '/'
}

async function authenticateApiKey(
  admin: SupabaseClient,
  authHeader: string | null
): Promise<{ profile: ProfileRow } | Response> {
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse('Missing or invalid Authorization header. Use: Bearer cd_gh_...', 401)
  }

  const apiKey = authHeader.slice(7).trim()
  if (!apiKey.startsWith('cd_gh_')) {
    return errorResponse('Invalid API key format', 401)
  }

  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, wallet_balance, store_balance, store_published, full_name, email')
    .eq('api_key', apiKey)
    .single()

  if (error || !profile) {
    return errorResponse('Invalid API key', 401)
  }

  return { profile: profile as ProfileRow }
}

function effectivePrice(
  pkg: { user_price: number; agent_price: number },
  storePublished: boolean
): number {
  return Number(storePublished ? pkg.agent_price : pkg.user_price)
}

async function handlePackages(admin: SupabaseClient, profile: ProfileRow) {
  const { data: packages, error } = await admin
    .from('data_packages')
    .select('id, network, size_gb, user_price, agent_price, validity, sort_order')
    .eq('is_active', true)
    .order('network')
    .order('sort_order')

  if (error) {
    return errorResponse(error.message, 500)
  }

  return jsonResponse({
    success: true,
    account_type: profile.store_published ? 'agent' : 'user',
    packages: (packages ?? []).map((pkg) => ({
      id: pkg.id,
      network: networkLabel(pkg.network),
      network_code: pkg.network,
      size_gb: Number(pkg.size_gb),
      package_size: packageSize(Number(pkg.size_gb)),
      price: effectivePrice(pkg, profile.store_published),
      validity: pkg.validity,
    })),
  })
}

async function handleBalance(profile: ProfileRow) {
  return jsonResponse({
    success: true,
    wallet_balance: Number(profile.wallet_balance),
    store_balance: Number(profile.store_balance),
    account_type: profile.store_published ? 'agent' : 'user',
    currency: 'GHS',
  })
}

async function handleTransactions(
  admin: SupabaseClient,
  profile: ProfileRow,
  url: URL
) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10) || 20, 100)
  const type = url.searchParams.get('type')

  let query = admin
    .from('transactions')
    .select('id, type, network, phone, amount, status, description, provider_order_id, external_reference, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query
  if (error) {
    return errorResponse(error.message, 500)
  }

  return jsonResponse({ success: true, transactions: data ?? [] })
}

async function handleTransactionById(
  admin: SupabaseClient,
  profile: ProfileRow,
  txId: string
) {
  const { data, error } = await admin
    .from('transactions')
    .select('id, type, network, phone, amount, status, description, provider_order_id, provider_status, provider_error, external_reference, created_at')
    .eq('id', txId)
    .eq('user_id', profile.id)
    .single()

  if (error || !data) {
    return errorResponse('Transaction not found', 404)
  }

  return jsonResponse({ success: true, transaction: data })
}

async function handlePurchase(
  admin: SupabaseClient,
  profile: ProfileRow,
  body: Record<string, unknown>
) {
  const packageId = body.package_id as string | undefined
  const phone = body.phone as string | undefined
  const requestId = (body.request_id as string | undefined) ?? undefined

  if (!packageId || !phone) {
    return errorResponse('package_id and phone are required')
  }

  const { data: txId, error: purchaseError } = await admin.rpc('api_purchase_data_package', {
    p_user_id: profile.id,
    p_package_id: packageId,
    p_phone: phone,
    p_request_id: requestId ?? null,
  })

  if (purchaseError) {
    return errorResponse(purchaseError.message, 400)
  }

  const { data: tx } = await admin
    .from('transactions')
    .select('id, amount, status, provider_order_id, provider_status, provider_error')
    .eq('id', txId)
    .single()

  if (tx?.status === 'processing') {
    const fulfill = await fulfillSwiftDataOrder(admin, txId as string)
    if (!fulfill.success) {
      return jsonResponse({
        success: false,
        transaction_id: txId,
        status: 'failed',
        error: fulfill.error,
        amount: tx?.amount,
      }, 400)
    }

    return jsonResponse({
      success: true,
      transaction_id: txId,
      status: 'success',
      amount: tx?.amount,
      provider_order_id: fulfill.order_id ?? null,
    })
  }

  return jsonResponse({
    success: true,
    transaction_id: txId,
    status: tx?.status ?? 'success',
    amount: tx?.amount,
    provider_order_id: tx?.provider_order_id ?? null,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const route = getRoute(url.pathname)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    if (route === '/' || route === '') {
      return jsonResponse({
        success: true,
        name: 'CrazyDeals Ghana Developer API',
        version: API_VERSION,
        docs: 'https://crazydealsgh.shop/api-docs',
        base_url: 'https://crazydealsgh.shop/api/v1',
        endpoints: {
          packages: 'GET /api/v1/packages',
          balance: 'GET /api/v1/wallet/balance',
          transactions: 'GET /api/v1/transactions',
          transaction: 'GET /api/v1/transactions/:id',
          purchase: 'POST /api/v1/data/purchase',
        },
      })
    }

    const auth = await authenticateApiKey(admin, req.headers.get('Authorization'))
    if (auth instanceof Response) return auth
    const { profile } = auth

    if (route === '/packages' && req.method === 'GET') {
      return handlePackages(admin, profile)
    }

    if (route === '/wallet/balance' && req.method === 'GET') {
      return handleBalance(profile)
    }

    if (route === '/transactions' && req.method === 'GET') {
      return handleTransactions(admin, profile, url)
    }

    const txMatch = route.match(/^\/transactions\/([0-9a-f-]{36})$/i)
    if (txMatch && req.method === 'GET') {
      return handleTransactionById(admin, profile, txMatch[1])
    }

    if (route === '/data/purchase' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      return handlePurchase(admin, profile, body)
    }

    return errorResponse(`Unknown route: ${route}`, 404)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
