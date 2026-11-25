import authorizedAxios from '~/utils/http/authorizedAxios'
import { CUSTOMER_API_ENDPOINTS } from '~/utils/config/constants'
import { customerOrderApi } from './customerOrderApi'
import { validOutcome } from '~/pages/customer/Payment/paymentOutcome'
import { validSummary } from '~/pages/customer/Payment/combinedPaymentModel'

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
  getSummary: async (orderId, pointsToRedeem = 0, signal) => {
    const value = await authorizedAxios.get(`/payment/orders/${encodeURIComponent(orderId)}/summary`, { params: { pointsToRedeem }, signal }).then(unwrap)
    if (!validSummary(value, orderId)) {
      throw new Error('customer.payment.invalidResponse')
    }
    return value
  },
  checkout: (orderId, paymentMethod, pointsToRedeem, expectedQuoteToken) => authorizedAxios.post(`/payment/orders/${encodeURIComponent(orderId)}/checkout`, { paymentMethod, pointsToRedeem, expectedQuoteToken }).then(unwrap),
  getResult: async (context, signal) => {
    const { orderId, ...params } = context
    const value = await authorizedAxios.get(`/payment/orders/${encodeURIComponent(orderId)}/result`, { params, signal }).then(unwrap)
    if (!validOutcome(value, context)) {
      throw new Error('customer.payment.invalidResponse')
    }
    return value
  },
  getActiveSession: async (orderId, purpose, signal) => {
    const { data } = await authorizedAxios.get(`/payment/orders/${encodeURIComponent(orderId)}/active-session`, { params: { purpose }, signal })
    if (data?.succeeded !== true || data.data !== null && (!data.data || data.data.orderId !== orderId || data.data.purpose !== purpose || typeof data.data.canVerify !== 'boolean' || typeof data.data.requiresReconciliation !== 'boolean')) {
      throw new Error('customer.payment.invalidResponse')
    }
    return data.data
  },
  verifySession: (orderId, purpose, operationId) => authorizedAxios.post(`/payment/orders/${encodeURIComponent(orderId)}/verify-session`, { purpose, operationId }).then(unwrap),
  getVerification: (operationId, signal) => authorizedAxios.get(`/payment/verification-operations/${encodeURIComponent(operationId)}`, { signal }).then(unwrap),
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
  createUrl: (orderId, paymentMethod, pointsToRedeem) => {
    if (pointsToRedeem !== undefined && (!Number.isSafeInteger(pointsToRedeem) || pointsToRedeem < 0)) {
      throw new Error('loyalty.invalidPoints')
    }
    return authorizedAxios.post(CUSTOMER_API_ENDPOINTS.PAYMENT, { orderId, paymentMethod, ...(pointsToRedeem === undefined ? {} : { pointsToRedeem }) }).then(unwrap)
  }
}
