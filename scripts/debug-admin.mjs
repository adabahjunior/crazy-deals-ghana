const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = 'qdpszufiwgweniwjdolu'

const queries = [
  `SELECT id, email, full_name, is_admin FROM profiles WHERE email ILIKE '%adabahjunior%' OR full_name ILIKE '%adabah%'`,
  `SELECT id, email FROM auth.users WHERE email = 'adabahjunior@gmail.com'`,
  `SELECT id, email, is_admin FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'adabahjunior@gmail.com')`,
]

for (const query of queries) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  console.log('Q:', query.slice(0, 80))
  console.log(await res.text(), '\n---')
}
