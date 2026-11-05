import authorizedAxios from '~/utils/authorizedAxios'
import { CUSTOMER_API_ENDPOINTS } from '~/utils/constants'

const unwrap = ({ data }) => {
  if (data?.succeeded !== true || !data.data) {
    throw new Error(data?.message || 'customer.order.invalidResponse')
  }
  return data.data
}

export const customerOrderApi = {
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
