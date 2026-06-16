import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = 'qdpszufiwgweniwjdolu'
const apiKey = process.env.SWIFTDATA_API_KEY

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is required')
  process.exit(1)
}

if (!apiKey) {
  console.error('SWIFTDATA_API_KEY is required')
  process.exit(1)
}

const escaped = apiKey.replace(/'/g, "''")

const sql = `
UPDATE public.site_settings
SET value = '${escaped}', updated_at = now()
WHERE key = 'swiftdata_api_key';

UPDATE public.site_settings
SET value = 'true', updated_at = now()
WHERE key = 'swiftdata_enabled';
`

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const text = await res.text()
if (!res.ok) {
  console.error('Failed to set SwiftData API key:', res.status, text)
  process.exit(1)
}

console.log('SwiftData API key configured successfully')
