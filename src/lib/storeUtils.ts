export function getStoreUrl(slug: string) {
  return `${window.location.origin}/store/${slug}`
}

export function getWhatsAppUrl(phone: string, message: string) {
  const intl = phone.startsWith('0') ? `233${phone.slice(1)}` : phone
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
}

export function networkCardClass(network: string): 'mtn' | 'airtel' | 'telecel' {
  const n = network.toLowerCase()
  if (n.includes('mtn')) return 'mtn'
  if (n.includes('telecel')) return 'telecel'
  return 'airtel'
}

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
}

export async function shareStoreLink(url: string, storeName: string) {
  if (navigator.share) {
    await navigator.share({
      title: `${storeName} - Data Store`,
      text: `Buy affordable data bundles from ${storeName}`,
      url,
    })
    return true
  }
  await copyToClipboard(url)
  return false
}
