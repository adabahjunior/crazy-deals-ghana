const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = 'qdpszufiwgweniwjdolu'

const query = `
UPDATE public.profiles
SET is_admin = true, updated_at = now()
WHERE email = 'adabahjunior@gmail.com'
RETURNING id, email, full_name, is_admin;
`

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
})

console.log(await res.text())
