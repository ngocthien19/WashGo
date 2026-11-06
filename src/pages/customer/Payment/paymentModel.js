import { ORDER_PAYMENT_METHODS, ORDER_STATUSES, PAYMENT_STATUSES } from '~/utils/constants'

export const paymentBlockReason = (order) => {
  if (order.paymentStatus === PAYMENT_STATUSES.PAID) {
    return 'customer.payment.paid'
  }
  if (order.paymentStatus !== PAYMENT_STATUSES.UNPAID) {
    return 'customer.payment.unavailable'
  }
  if (![ORDER_STATUSES.AWAITING_PAYMENT, ORDER_STATUSES.MOVED_TO_STORAGE].includes(order.status)) {
    return 'customer.payment.processingNote'
  }
  if (order.includedWeightKg > 0 && order.actualWeightKg == null) {
    return 'customer.payment.waitingWeight'
  }
  return ''
}

export const onlinePaymentMethod = (value) => [ORDER_PAYMENT_METHODS.VNPAY, ORDER_PAYMENT_METHODS.MOMO].includes(value)

// Gateway references locate an order only. They never prove that a payment succeeded.
export const returnedOrderCode = (params) => {
  const reference = params.get('vnp_TxnRef') || params.get('orderId') || ''
  return /^WG-PAY-([A-Za-z0-9]+)-[a-f0-9]{16}(?:[a-f0-9]{16})?$/i.exec(reference)?.[1] || ''
}

export const paymentRedirectUrl = (value) => {
  try {
    const url = new URL(value)
    if (!url.username && !url.password && (url.protocol === 'https:'
      || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
      return url.href
    }
  } catch { /* Invalid gateway responses must not trigger navigation. */ }
  throw new Error('customer.payment.invalidResponse')
}
