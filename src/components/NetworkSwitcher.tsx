import { getOrderedNetworkKeys } from '../lib/networkOrder'
import { networkCardClass } from '../lib/storeUtils'

interface NetworkSwitcherProps {
  networks: string[]
  selected: string
  onChange: (network: string) => void
  className?: string
}

export default function NetworkSwitcher({
  networks,
  selected,
  onChange,
  className = '',
}: NetworkSwitcherProps) {
  const ordered = getOrderedNetworkKeys(networks)

  if (ordered.length === 0) return null

  return (
    <div className={`network-switcher ${className}`.trim()} role="tablist" aria-label="Select network">
      {ordered.map((network) => (
        <button
          key={network}
          type="button"
          role="tab"
          aria-selected={selected === network}
          className={`network-switcher-btn ${networkCardClass(network)} ${selected === network ? 'active' : ''}`}
          onClick={() => onChange(network)}
        >
          {network}
        </button>
      ))}
    </div>
  )
}

export function defaultNetworkSelection(networks: string[]): string {
  const ordered = getOrderedNetworkKeys(networks)
  return ordered[0] ?? ''
}
