const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = 'qdpszufiwgweniwjdolu'

const queries = [
  `SELECT tgname, tgenabled FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'auth' AND c.relname = 'users' AND NOT t.tgisinternal`,
  `SELECT grantee, privilege_type FROM information_schema.table_privileges WHERE table_name = 'profiles' AND table_schema = 'public'`,
]

for (const query of queries) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  console.log(await res.text(), '\n---')
}
