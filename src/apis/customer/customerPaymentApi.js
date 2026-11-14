import authorizedAxios from '~/utils/http/authorizedAxios'
import { CUSTOMER_API_ENDPOINTS } from '~/utils/config/constants'
import { customerOrderApi } from './customerOrderApi'

const unwrap = ({ data }) => {
  if (data?.succeeded !== true || !data.data) {
    throw new Error(data?.message || 'customer.payment.invalidResponse')
  }
  return data.data
}

const validOrder = (order) => {
  if (!order?.id || !order.orderCode || !Number.isFinite(order.finalAmount) || order.finalAmount < 0) {
    throw new Error('customer.payment.invalidResponse')
  }
  return order
}

export const customerPaymentApi = {
  createFeeUrl: (orderId, paymentMethod, kind) => {
    if (!['cancellation', 'overdue'].includes(kind)) {
      throw new Error('customer.payment.invalidResponse')
    }
    return authorizedAxios.post(`/payment/${kind}-fee/create-url`, { orderId, paymentMethod }).then(unwrap)
  },
  getOrder: (id, signal) => customerOrderApi.get(id, signal).then(validOrder),
  findReturnedOrder: async (code, signal) => {
    if (!code) {
      throw new Error('customer.payment.missingOrder')
    }
    const { data } = await authorizedAxios.post(CUSTOMER_API_ENDPOINTS.MY_ORDERS, { keyword: code, page: 1, take: 20 }, { signal })
    const matches = data?.list?.filter((order) => order.orderCode === code) || []
    if (data?.succeeded !== true || matches.length !== 1) {
      throw new Error('customer.payment.missingOrder')
    }
    // Fetch fresh, scoped detail rather than trusting redirect parameters or a cached order.
    return customerPaymentApi.getOrder(matches[0].id, signal)
  },
  createUrl: (orderId, paymentMethod) => authorizedAxios.post(CUSTOMER_API_ENDPOINTS.PAYMENT, { orderId, paymentMethod }).then(unwrap)
}
