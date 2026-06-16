import { networkLabels, type NetworkType } from '../types/database'

export const NETWORK_ORDER: NetworkType[] = ['mtn', 'airtel-ishare', 'airtel-bigtime', 'telecel']

const labelToType = Object.fromEntries(
  NETWORK_ORDER.map((n) => [networkLabels[n], n])
) as Record<string, NetworkType>

export function resolveNetworkType(network: string): NetworkType | null {
  if (NETWORK_ORDER.includes(network as NetworkType)) {
    return network as NetworkType
  }
  return labelToType[network] ?? null
}

export function networkOrderIndex(network: string): number {
  const type = resolveNetworkType(network)
  if (!type) return 999
  return NETWORK_ORDER.indexOf(type)
}

export function compareNetworks(a: string, b: string): number {
  return networkOrderIndex(a) - networkOrderIndex(b)
}

export function sortByNetworkAndSize<T extends { network: string; size_gb: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const byNetwork = compareNetworks(a.network, b.network)
    if (byNetwork !== 0) return byNetwork
    return Number(a.size_gb) - Number(b.size_gb)
  })
}

export function getOrderedNetworkKeys(networks: string[]): string[] {
  return [...new Set(networks)].sort(compareNetworks)
}

export function groupByNetwork<T extends { network: string; size_gb: number }>(
  items: T[]
): { network: string; packages: T[] }[] {
  const sorted = sortByNetworkAndSize(items)
  const map = new Map<string, T[]>()

  for (const item of sorted) {
    const list = map.get(item.network) ?? []
    list.push(item)
    map.set(item.network, list)
  }

  return getOrderedNetworkKeys([...map.keys()]).map((network) => ({
    network,
    packages: map.get(network) ?? [],
  }))
}

export function catalogOptionLabel(sizeGb: number, agentPrice: number): string {
  return `${sizeGb} GB — base GHS ${Number(agentPrice).toFixed(2)}`
}
