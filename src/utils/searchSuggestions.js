import { formatCurrency, formatLockerAddress } from './formats'
import { SEARCH_SUGGESTIONS } from './constants'

export async function loadSuggestionPages(load, filter, keyword, signal) {
  const query = { ...filter, keyword: keyword.trim().normalize('NFC').toLocaleLowerCase(), take: filter.take || SEARCH_SUGGESTIONS.PAGE_SIZE }
  const items = []
  let page = 1
  let totalPages = 1
  do {
    signal?.throwIfAborted()
    const response = await load({ ...query, page }, signal)
    items.push(...response.list || [])
    totalPages = response.totalPages || 1
    page += 1
  } while (page <= totalPages)
  return items
}

export function suggestionImages(item) {
  if (Array.isArray(item?.imageUrls)) {
    return item.imageUrls.filter(value => typeof value === 'string' && value.trim())
  }
  const raw = item?.images
  if (!raw) {
    return []
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed.filter(value => typeof value === 'string' && value.trim()) : []
  } catch {
    return typeof raw === 'string' && /^(\/|https?:\/\/)/.test(raw) ? [raw] : []
  }
}

export function resourceSuggestion(item, kind = 'record') {
  const shipper = kind === 'task' || kind === 'delivery'
  const value = kind === 'service' ? item.proposed || item : item
  const id = item.taskId || item.eventId || item.id
  const label = kind === 'service' || kind === 'locker' ? value.name
    : kind === 'merchant' ? item.businessName || item.merchantName || item.proposed?.businessName
      : kind === 'shipper' ? item.fullName
        : item.orderCode || item.title || item.code || item.merchantName || item.name || item.fullName || item.comment || item.reason || item.summary || item.action
  if (!id || !label) {
    return null
  }
  const fields = [...new Set([
    label, value.code || item.serviceCode || item.current?.code, item.merchantOrderCode,
    ...(kind === 'locker' || kind === 'merchant' ? [formatLockerAddress(value)] : []),
    ...(kind === 'service' ? [formatCurrency(value.unitPrice) + ' / ' + (value.unit || '—')] : []),
    item.merchantName, ...(!shipper ? [item.customerName] : []), item.lockerName, item.taskLockerName, item.taskLockerAddress,
    item.phone || item.phoneNumber, item.email, item.vehiclePlate, item.comment, item.description, item.content, item.reason, item.paymentReference,
    ...(kind === 'audit' ? [item.actorName, item.module, item.action, item.resourceType, item.resourceId, item.summary] : [])
  ].filter(text => typeof text === 'string' && text.trim()))]
  return { id, label, fields, images: ['service', 'locker', 'merchant'].includes(kind) ? suggestionImages(value) : undefined }
}
