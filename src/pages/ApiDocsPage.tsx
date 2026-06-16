import { Link } from 'react-router-dom'
import { API_BASE_URL, API_DOCS_URL } from '../lib/apiConfig'
import { useState } from 'react'

type CodeLang = 'curl' | 'node' | 'python'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'auth', label: 'Authentication' },
  { id: 'packages', label: 'List Packages' },
  { id: 'balance', label: 'Wallet Balance' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'purchase', label: 'Purchase Data' },
  { id: 'errors', label: 'Errors' },
]

function CodeBlock({ lang, code }: { lang: CodeLang; code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="api-code-block">
      <div className="api-code-header">
        <span>{lang}</span>
        <button type="button" className="btn btn-ghost" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  )
}

export default function ApiDocsPage() {
  const [activeLang, setActiveLang] = useState<CodeLang>('curl')

  const purchaseExamples: Record<CodeLang, string> = {
    curl: `curl -X POST "${API_BASE_URL}/data/purchase" \\
  -H "Authorization: Bearer cd_gh_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "package_id": "PACKAGE_UUID",
    "phone": "0244123456",
    "request_id": "order-unique-001"
  }'`,
    node: `const response = await fetch('${API_BASE_URL}/data/purchase', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer cd_gh_YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    package_id: 'PACKAGE_UUID',
    phone: '0244123456',
    request_id: 'order-unique-001',
  }),
});

const data = await response.json();
console.log(data);`,
    python: `import requests

response = requests.post(
    "${API_BASE_URL}/data/purchase",
    headers={
        "Authorization": "Bearer cd_gh_YOUR_API_KEY",
        "Content-Type": "application/json",
    },
    json={
        "package_id": "PACKAGE_UUID",
        "phone": "0244123456",
        "request_id": "order-unique-001",
    },
)

print(response.json())`,
  }

  return (
    <div className="api-docs-page">
      <header className="api-docs-header">
        <div className="api-docs-header-inner">
          <Link to="/" className="api-docs-logo">CrazyDeals Ghana</Link>
          <nav className="api-docs-nav">
            <Link to="/">Sign In</Link>
            <Link to="/dashboard/developer-api" className="btn btn-primary">Get API Key</Link>
          </nav>
        </div>
      </header>

      <div className="api-docs-layout">
        <aside className="api-docs-sidebar">
          <p className="api-docs-sidebar-label">Reference</p>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="api-docs-sidebar-link">{s.label}</a>
          ))}
        </aside>

        <main className="api-docs-main">
          <section id="overview" className="api-docs-section">
            <span className="status-badge info">REST API v1.0</span>
            <h1>CrazyDeals Ghana API Reference</h1>
            <p>
              Integrate MTN, Telecel, and AirtelTigo data bundles into your website, app, or USSD platform.
              RESTful JSON API with Bearer authentication.
            </p>
            <div className="api-docs-meta">
              <div><strong>Base URL</strong><code>{API_BASE_URL}</code></div>
              <div><strong>Docs URL</strong><code>{API_DOCS_URL}</code></div>
            </div>
          </section>

          <section id="auth" className="api-docs-section">
            <h2>Authentication</h2>
            <p>
              All requests require your API key in the <code>Authorization</code> header.
              Get your key from the dashboard after signing in: <strong>Developer API</strong>.
            </p>
            <CodeBlock lang="curl" code={`Authorization: Bearer cd_gh_YOUR_API_KEY`} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Never expose your API key in client-side code. Always call the API from your backend server.
            </p>
          </section>

          <section id="packages" className="api-docs-section">
            <h2>List Packages</h2>
            <p>Returns all active data packages with prices for your account type (User or Agent).</p>
            <div className="api-endpoint-badge"><span className="method get">GET</span> /api/v1/packages</div>
            <CodeBlock lang="curl" code={`curl "${API_BASE_URL}/packages" \\
  -H "Authorization: Bearer cd_gh_YOUR_API_KEY"`} />
            <h3>Response</h3>
            <CodeBlock lang="curl" code={`{
  "success": true,
  "account_type": "agent",
  "packages": [
    {
      "id": "uuid",
      "network": "MTN",
      "network_code": "mtn",
      "size_gb": 5,
      "package_size": "5GB",
      "price": 18.00,
      "validity": "Non expiry"
    }
  ]
}`} />
          </section>

          <section id="balance" className="api-docs-section">
            <h2>Wallet Balance</h2>
            <p>Check your wallet balance before making purchases.</p>
            <div className="api-endpoint-badge"><span className="method get">GET</span> /api/v1/wallet/balance</div>
            <CodeBlock lang="curl" code={`curl "${API_BASE_URL}/wallet/balance" \\
  -H "Authorization: Bearer cd_gh_YOUR_API_KEY"`} />
            <h3>Response</h3>
            <CodeBlock lang="curl" code={`{
  "success": true,
  "wallet_balance": 150.00,
  "store_balance": 25.00,
  "account_type": "user",
  "currency": "GHS"
}`} />
          </section>

          <section id="transactions" className="api-docs-section">
            <h2>Transactions</h2>
            <p>List your recent transactions. Optional query params: <code>limit</code> (max 100), <code>type</code>.</p>
            <div className="api-endpoint-badge"><span className="method get">GET</span> /api/v1/transactions</div>
            <CodeBlock lang="curl" code={`curl "${API_BASE_URL}/transactions?limit=20" \\
  -H "Authorization: Bearer cd_gh_YOUR_API_KEY"`} />
            <div className="api-endpoint-badge" style={{ marginTop: '1rem' }}>
              <span className="method get">GET</span> /api/v1/transactions/:id
            </div>
            <p>Check the status of a specific transaction by ID.</p>
          </section>

          <section id="purchase" className="api-docs-section">
            <h2>Purchase Data</h2>
            <p>
              Buy a data bundle and send it to a Ghana phone number. Amount is deducted from your wallet.
              Use <code>request_id</code> for idempotency — retries with the same ID won&apos;t double-charge.
            </p>
            <div className="api-endpoint-badge"><span className="method post">POST</span> /api/v1/data/purchase</div>

            <div className="api-lang-tabs">
              {(['curl', 'node', 'python'] as CodeLang[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`api-lang-tab ${activeLang === lang ? 'active' : ''}`}
                  onClick={() => setActiveLang(lang)}
                >
                  {lang === 'node' ? 'Node.js' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
            <CodeBlock lang={activeLang} code={purchaseExamples[activeLang]} />

            <h3>Request Body</h3>
            <table className="data-table">
              <thead>
                <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>package_id</td><td>string</td><td>Yes</td><td>UUID from GET /packages</td></tr>
                <tr><td>phone</td><td>string</td><td>Yes</td><td>Recipient Ghana number (e.g. 0244123456)</td></tr>
                <tr><td>request_id</td><td>string</td><td>No</td><td>Your unique reference for idempotency</td></tr>
              </tbody>
            </table>

            <h3>Response</h3>
            <CodeBlock lang="curl" code={`{
  "success": true,
  "transaction_id": "uuid",
  "status": "success",
  "amount": 18.00,
  "provider_order_id": "external-ref"
}`} />
          </section>

          <section id="errors" className="api-docs-section">
            <h2>Error Reference</h2>
            <table className="data-table">
              <thead>
                <tr><th>HTTP</th><th>Meaning</th></tr>
              </thead>
              <tbody>
                <tr><td>401</td><td>Invalid or missing API key</td></tr>
                <tr><td>400</td><td>Bad request (invalid phone, insufficient balance, etc.)</td></tr>
                <tr><td>404</td><td>Resource not found</td></tr>
                <tr><td>500</td><td>Server error</td></tr>
              </tbody>
            </table>
            <CodeBlock lang="curl" code={`{ "success": false, "error": "Insufficient wallet balance" }`} />
          </section>
        </main>
      </div>

      <footer className="api-docs-footer">
        <p>© CrazyDeals Ghana · <Link to="/">crazydealsgh.shop</Link></p>
      </footer>
    </div>
  )
}
