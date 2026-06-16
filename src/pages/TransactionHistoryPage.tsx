import PageHeader from '../components/PageHeader'
import { useTransactions, formatDate, formatMoney } from '../hooks/useTransactions'

const typeLabels: Record<string, string> = {
  data_purchase: 'Data Purchase',
  wallet_topup: 'Wallet Top Up',
  store_order: 'Store Order',
  withdrawal: 'Withdrawal',
  store_activation: 'Store Activation',
}

export default function TransactionHistoryPage() {
  const { transactions, loading } = useTransactions()

  return (
    <>
      <PageHeader
        title="Transaction History"
        description="View all your past transactions and their status"
      />

      <div className="content-card">
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : transactions.length === 0 ? (
          <div className="empty-state"><p>No transactions yet.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>Network</th>
                <th>Phone</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.id.slice(0, 8).toUpperCase()}</td>
                  <td>{formatDate(tx.created_at)}</td>
                  <td>{typeLabels[tx.type] ?? tx.type}</td>
                  <td>{tx.network ?? '-'}</td>
                  <td>{tx.phone ?? '-'}</td>
                  <td>{formatMoney(tx.amount)}</td>
                  <td>
                    <span className={`status-badge ${tx.status}`}>
                      {tx.status === 'processing'
                        ? 'Processing'
                        : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
