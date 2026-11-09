import i18n from '~/i18n'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import { validDay, validRange, dateRangeFilter } from '~/utils/dateRange'
import { CUSTOMER_ROUTES } from '~/utils/constants'
import { NOTIFICATION_CATEGORIES, notificationTypesFor } from './notificationCatalog'

export function notificationText(item, t) {
  if (!/^[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*){1,3}$/.test(item.messageKey || '')) {
    return { title: item.title, content: item.content }
  }
  const args = Object.fromEntries(Object.entries(item.messageArgs || {}).filter(([key, value]) => typeof value === 'string' && !['lng', 'ns', 'defaultValue', 'returnObjects', 'interpolation'].includes(key)))
  const prefix = item.messageKey.startsWith('notification.') ? item.messageKey : `notificationMessages.${item.messageKey}`
  for (const key of ['depositDeadline', 'pickupDeadline', 'paymentDeadline']) {
    if (args[key] && Number.isFinite(Date.parse(args[key]))) {
      args[key] = formatDateTime(args[key])
    }
  }
  for (const key of ['amount', 'fee', 'compensationAmount']) {
    if (args[key] && Number.isFinite(Number(args[key]))) {
      args[key] = formatCurrency(Number(args[key]))
    }
  }
  if (['Washing', 'Drying', 'Ironing', 'Folding'].includes(args.step)) {
    args.step = t(`customer.orders.status.${args.step.toUpperCase()}`)
  }
  const template = i18n.getResource(i18n.resolvedLanguage, 'translation', `${prefix}.content`)
  const complete = typeof template === 'string' && [...template.matchAll(/{{(\w+)}}/g)].every((match) => Object.hasOwn(args, match[1]))
  return { title: t(`${prefix}.title`, { ...args, defaultValue: item.title }), content: complete ? t(`${prefix}.content`, args) : item.content }
}

export function notificationHighlights(item, content) {
  const values = Object.entries(item.messageArgs || {})
    .filter(([key, value]) => /^(orderCode|lockerName|returnLockerName|boxNumber|reason|storageLocation|storageReference|depositMinutes|minutes|hours|days|amount|fee|compensationAmount|depositDeadline|pickupDeadline|paymentDeadline)$/.test(key) && typeof value === 'string' && value.trim())
    .flatMap(([key, value]) => [value, /^(amount|fee|compensationAmount)$/.test(key) && Number.isFinite(Number(value)) ? formatCurrency(Number(value)) : null, /Deadline$/.test(key) && Number.isFinite(Date.parse(value)) ? formatDateTime(value) : null])
    .filter(Boolean)
  const ranges = []
  const reasonRanges = []
  for (const value of new Set(values)) {
    let start = content.indexOf(value)
    while (start !== -1) {
      ranges.push([start, start + value.length])
      if (value === item.messageArgs?.reason) {
        reasonRanges.push([start, start + value.length])
      }
      start = content.indexOf(value, start + value.length)
    }
  }
  // Legacy notifications may not contain structured arguments.
  for (const match of content.matchAll(/#?WG[A-Z0-9-]+|\d+(?:[.,:/-]\d+)*(?:\s*(?:phút|giờ|ngày|minutes?|hours?|days?|kg|₫|đ|%)(?![\p{L}\p{N}_]))?/giu)) {
    ranges.push([match.index, match.index + match[0].length])
  }
  for (const match of content.matchAll(/(?:tại|đến|at)\s+((?:Trạm\s+Locker|Trạm|Locker)\s+[^,;\n.!]+)|(?:lý do|reason)\s*:\s*([^\n.!]+)/gi)) {
    const value = (match[1] || match[2]).trim()
    const start = match.index + match[0].indexOf(value)
    ranges.push([start, start + value.length])
    if (match[2]) {
      reasonRanges.push([start, start + value.length])
    }
  }
  const merged = []
  for (const range of ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1])) {
    const previous = merged.at(-1)
    if (previous && range[0] <= previous[1]) {
      previous[1] = Math.max(previous[1], range[1])
    } else {
      merged.push([...range])
    }
  }
  const parts = []
  let cursor = 0
  for (const [start, end] of merged) {
    if (start > cursor) {
      parts.push({ text: content.slice(cursor, start), bold: false })
    }
    const boundaries = [...new Set([start, end, ...reasonRanges.flat().filter((point) => point > start && point < end)])].sort((a, b) => a - b)
    for (let index = 0; index < boundaries.length - 1; index++) {
      const left = boundaries[index], right = boundaries[index + 1]
      parts.push({ text: content.slice(left, right), bold: true, reason: reasonRanges.some(([from, to]) => left >= from && right <= to) })
    }
    cursor = end
  }
  if (cursor < content.length) {
    parts.push({ text: content.slice(cursor), bold: false })
  }
  return parts
}

export function notificationHref(item) {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.linkId || '')) {
    return null
  }
  if (item.linkType === 'order') {
    return CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', item.linkId)
  }
  if (item.linkType === 'incident') {
    return CUSTOMER_ROUTES.COMPLAINT_DETAIL.replace(':incidentId', item.linkId)
  }
  return null
}

export const NOTIFICATION_GROUPS = ['order', 'payment', 'promotion', 'feedback', 'system']
export const CUSTOMER_NOTIFICATION_TYPES = notificationTypesFor('Customer')
export function notificationFilters(params, types = CUSTOMER_NOTIFICATION_TYPES, categories = NOTIFICATION_CATEGORIES.Customer) {
  const category = categories.find(item => item.id === params.get('group'))
  const group = category?.group || (!category && NOTIFICATION_GROUPS.includes(params.get('group')) ? params.get('group') : '')
  const type = Number(params.get('type'))
  const from = validDay(params.get('from') || '') ? params.get('from') : ''
  const to = validDay(params.get('to') || '') ? params.get('to') : ''
  const selected = types.includes(type) && (!category || category.types.includes(type)) ? [type] : category?.types
  return { keyword: (params.get('keyword') || '').trim().slice(0, 100), groups: group ? [group] : undefined, types: selected, sort: ['newest', 'oldest', 'unreadFirst'].includes(params.get('sort')) ? params.get('sort') : 'newest', ...(validRange(from, to) ? dateRangeFilter({ from, to }) : {}) }
}
