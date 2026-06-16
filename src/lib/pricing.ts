import type { DataPackage } from '../types/database'

export function isAgent(profile: { store_published?: boolean } | null | undefined): boolean {
  return !!profile?.store_published
}

export function getEffectivePrice(pkg: DataPackage, agent: boolean): number {
  return Number(agent ? pkg.agent_price : pkg.user_price)
}

export function mapPackagesWithPrice(packages: DataPackage[], agent: boolean): DataPackage[] {
  return packages.map((pkg) => ({
    ...pkg,
    price: getEffectivePrice(pkg, agent),
  }))
}

export function accountTypeLabel(storePublished: boolean): 'Agent' | 'User' {
  return storePublished ? 'Agent' : 'User'
}
