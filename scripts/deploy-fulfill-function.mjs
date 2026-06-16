import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = 'qdpszufiwgweniwjdolu'

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is required')
  process.exit(1)
}

const fnPath = join(__dirname, '../supabase/functions/fulfill-data-order/index.ts')
const code = readFileSync(fnPath, 'utf8')

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions/fulfill-data-order`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'fulfill-data-order',
    slug: 'fulfill-data-order',
    verify_jwt: true,
    import_map: false,
    entrypoint_path: 'index.ts',
    source: code,
  }),
})

const text = await res.text()
if (!res.ok) {
  console.error('Deploy failed:', res.status, text)
  console.log('\nDeploy manually with: npx supabase functions deploy fulfill-data-order --project-ref', projectRef)
  process.exit(1)
}

console.log('Edge function deployed successfully')
console.log(text)
