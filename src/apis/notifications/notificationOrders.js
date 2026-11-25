import authorizedAxios from '~/utils/http/authorizedAxios'

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
export const isOrderCode = value => typeof value === 'string' && /^WG[A-Z0-9-]+$/i.test(value)
export const isNewOrderNotification = item => item.messageKey === 'orderEvent.OrderCreated' || item.messageKey === 'orderCreated.admin'
  || item.type === 1 && !item.messageKey?.endsWith('.customer')
export const isStorageNotification = item => ['storage.customer.private', 'paymentSucceeded.storage.customer'].includes(item.messageKey)

// Resolve only the order explicitly linked by the notification. Do not guess from message text.
export async function resolveNotificationOrders(items, signal) {
  const ids = [...new Set(items.filter(item => item.linkType === 'order' && uuid.test(item.linkId || '')
    && (isStorageNotification(item) && !isOrderCode(item.messageArgs?.orderCode)
      || isNewOrderNotification(item) && (!item.messageArgs?.lockerName || !item.messageArgs?.boxNumber)
      || !isOrderCode(item.messageArgs?.orderCode) && `${item.title} ${item.content} ${item.messageArgs?.orderCode || ''}`.toLowerCase().includes(item.linkId.toLowerCase()))).map(item => item.linkId))]
  const codes = new Map()
  const summaries = new Map()
  await Promise.allSettled(ids.map(async id => {
    const { data } = await authorizedAxios.get(`/wash-order/${encodeURIComponent(id)}`, { signal })
    if (data?.succeeded === true && data.data?.id === id && isOrderCode(data.data.orderCode)) {
      codes.set(id, data.data.orderCode)
      if (items.some(item => item.linkId === id && isNewOrderNotification(item))) {
        const summary = {}
        if (typeof data.data.lockerName === 'string' && data.data.lockerName.trim()) {
          summary.lockerName = data.data.lockerName
        }
        if (Number.isInteger(data.data.boxNumber) && data.data.boxNumber > 0) {
          summary.boxNumber = String(data.data.boxNumber)
        }
        if (Object.keys(summary).length) {
          summaries.set(id, summary)
        }
      }
    }
  }))
  return items.map(item => codes.has(item.linkId) ? { ...item, displayOrderCode: codes.get(item.linkId), ...(isNewOrderNotification(item) && summaries.has(item.linkId) ? { displayOrderSummary: summaries.get(item.linkId) } : {}) } : item)
}
