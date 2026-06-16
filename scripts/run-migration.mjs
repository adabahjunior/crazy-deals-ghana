import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = 'qdpszufiwgweniwjdolu'
const file = process.argv[2] || '002_fix_signup.sql'

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is required')
  process.exit(1)
}

const sql = readFileSync(join(__dirname, '../supabase/migrations', file), 'utf8')

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
  console.error('Migration failed:', res.status, text)
  process.exit(1)
}

console.log('Migration completed successfully')
if (text && text !== '[]') console.log(text)
