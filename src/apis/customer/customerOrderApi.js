import authorizedAxios from '~/utils/authorizedAxios'
import { CUSTOMER_API_ENDPOINTS, ORDER_STATUSES } from '~/utils/constants'

const unwrap = ({ data }) => {
  if (data?.succeeded !== true || !data.data) {
    throw new Error(data?.message || 'customer.order.invalidResponse')
  }
  return data.data
}

export const customerOrderApi = {
  pickupStorage: (id, note) => authorizedAxios.post(`${CUSTOMER_API_ENDPOINTS.ORDERS}/${encodeURIComponent(id)}/pickup-storage`, { note }).then(unwrap).then((order) => {
    if (order.id !== id || ![ORDER_STATUSES.RETURNED, ORDER_STATUSES.COMPLETED].includes(order.status)) {
      throw new Error('customer.orders.scan.unknownOutcome')
    }
    return order
  }),
  deposit: (id, credentials) => authorizedAxios.post(`${CUSTOMER_API_ENDPOINTS.ORDERS}/${encodeURIComponent(id)}/deposit`, credentials).then(unwrap),
  openPickup: (id, credentials) => authorizedAxios.post(`${CUSTOMER_API_ENDPOINTS.ORDERS}/${encodeURIComponent(id)}/open-pickup-box`, credentials).then(unwrap),
  confirmPickup: (id, pickupSessionToken) => authorizedAxios.post(`${CUSTOMER_API_ENDPOINTS.ORDERS}/${encodeURIComponent(id)}/confirm-pickup`, { pickupSessionToken }).then(unwrap),
  get: (id, signal) => authorizedAxios.get(`${CUSTOMER_API_ENDPOINTS.ORDERS}/${encodeURIComponent(id)}`, { signal }).then(unwrap),
  list: (payload, signal) => authorizedAxios.post(CUSTOMER_API_ENDPOINTS.MY_ORDERS, payload, { signal }).then(({ data }) => {
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isFinite(data.total) || !Number.isInteger(data.currentPage)) {
      throw new Error(data?.message || 'customer.orders.invalidResponse')
    }
    return data
  }),
  cancellationQuote: (id, signal) => authorizedAxios.get(`${CUSTOMER_API_ENDPOINTS.ORDERS}/${encodeURIComponent(id)}/cancellation-quote`, { signal }).then(unwrap).then((quote) => {
    if (quote.orderId !== id || typeof quote.canCancel !== 'boolean'
      || ![quote.feeAmount, quote.refundAmount, quote.feeOutstanding].every((value) => Number.isFinite(value) && value >= 0)) {
      throw new Error('customer.orders.invalidResponse')
    }
    return quote
  }),
  cancel: (id, reason) => authorizedAxios.post(`${CUSTOMER_API_ENDPOINTS.ORDERS}/${encodeURIComponent(id)}/cancel`, { reason }).then(unwrap).then((order) => {
    if (order.id !== id || order.status !== ORDER_STATUSES.CANCELLED) {
      throw new Error('customer.orders.cancel.unknownOutcome')
    }
    return order
  }),
  quote: (payload, signal) => authorizedAxios.post(CUSTOMER_API_ENDPOINTS.ORDER_QUOTE, payload, { signal })
    .then(unwrap).then((quote) => {
      if (![quote.totalAmount, quote.discountAmount, quote.finalAmount].every((amount) => Number.isFinite(amount) && amount >= 0)
        || quote.discountAmount > quote.totalAmount || Math.abs(quote.finalAmount - (quote.totalAmount - quote.discountAmount)) > 0.01) {
        throw new Error('customer.order.invalidResponse')
      }
      return quote
    }),
  // Creating an order reserves a box. Never retry this POST automatically.
  create: (payload) => authorizedAxios.post(CUSTOMER_API_ENDPOINTS.ORDERS, payload).then(unwrap)
}
