const url = process.env.VITE_SUPABASE_URL || 'https://qdpszufiwgweniwjdolu.supabase.co'
const key = process.env.VITE_SUPABASE_ANON_KEY

const res = await fetch(`${url}/auth/v1/signup`, {
  method: 'POST',
  headers: {
    apikey: key,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: `test_${Date.now()}@crazydeals.gh`,
    password: 'testpass123',
    data: { full_name: 'Test User' },
  }),
})

const text = await res.text()
console.log('Status:', res.status)
console.log('Body:', text)
