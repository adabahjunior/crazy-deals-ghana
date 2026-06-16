import { readFileSync } from 'fs'

const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN required')
  process.exit(1)
}

const res = await fetch('https://api.supabase.com/v1/projects/qdpszufiwgweniwjdolu/database/query', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `SELECT api_key, wallet_balance FROM profiles WHERE email = 'adabahjunior@gmail.com' LIMIT 1`,
  }),
})

const rows = JSON.parse(await res.text())
const apiKey = rows[0]?.api_key
if (!apiKey) {
  console.error('No API key found')
  process.exit(1)
}

const base = 'https://qdpszufiwgweniwjdolu.supabase.co/functions/v1/developer-api'
const headers = { Authorization: `Bearer ${apiKey}` }

console.log('Testing packages...')
const pkgRes = await fetch(`${base}/packages`, { headers })
console.log('packages:', await pkgRes.json())

console.log('Testing balance...')
const balRes = await fetch(`${base}/wallet/balance`, { headers })
console.log('balance:', await balRes.json())

console.log('Testing transactions...')
const txRes = await fetch(`${base}/transactions?limit=3`, { headers })
console.log('transactions:', await txRes.json())
