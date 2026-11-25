import { validSummary } from './combinedPaymentModel'

export const paymentId = value => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value || '')
const pages = { Succeeded: 'success', Failed: 'failed', Cancelled: 'cancelled', Pending: null, RequiresReview: null, Refunded: null, NotStarted: null }
export function paymentContext(params) {
  const orderId = params.get('orderId'), purpose = Number(params.get('purpose')), sessionId = params.get('sessionId')
  return paymentId(orderId) && [1, 2, 3, 4].includes(purpose) && (!params.has('sessionId') || paymentId(sessionId)) ? { orderId, purpose, ...(sessionId ? { sessionId } : {}) } : null
}
export function validOutcome(value, context) {
  return value?.orderId === context.orderId && value.purpose === context.purpose && (!context.sessionId || value.sessionId === context.sessionId)
    && Object.hasOwn(pages, value.status) && value.resultPage === pages[value.status]
    && typeof value.verified === 'boolean' && typeof value.obligationSettled === 'boolean'
    && (value.status !== 'Succeeded' || value.verified)
    && (!value.summary || validSummary(value.summary, context.orderId))
    && (context.purpose !== 4 || !!value.summary)
    && (!value.allocations || Array.isArray(value.allocations) && value.allocations.every(row => [1, 2, 3].includes(row.purpose) && Number.isFinite(row.cashAmount) && row.cashAmount >= 0 && Number.isSafeInteger(row.points) && row.points >= 0))
    && value.capabilities && ['canVerify', 'canContinue', 'canRetry', 'canViewOrder'].every(key => typeof value.capabilities[key] === 'boolean')
}
export function paymentResultUrl(context, page) {
  return `${page ? `/payment/${page}` : `/orders/${context.orderId}`}?${new URLSearchParams(context)}`
}
export function safePaymentReturn(value) {
  if (typeof value !== 'string' || !/^\/(?:payment\/(success|failed|cancelled)|orders\/[a-f0-9-]+)(?:\?|$)/i.test(value)) {
    return null
  }
  const url = new URL(value, 'https://washgo.invalid')
  const context = paymentContext(url.searchParams)
  if (url.pathname.startsWith('/orders/') && (!context || url.pathname !== `/orders/${context.orderId}`)) {
    return null
  }
  return `${url.pathname}${context ? `?${new URLSearchParams(context)}` : ''}`
}
