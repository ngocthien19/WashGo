const uncertain = new Map()
const key = (userId, orderId) => `${userId}:${orderId}`
export const paymentIsUncertain = (userId, orderId) => uncertain.has(key(userId, orderId))
export const rememberUncertainPayment = (userId, orderId, purpose) => uncertain.set(key(userId, orderId), purpose)
export function clearUncertainPayment(userId, orderId, purpose) {
  if (uncertain.get(key(userId, orderId)) === purpose) {
    uncertain.delete(key(userId, orderId))
  }
}
export function resolveUncertainPayment(userId, result) {
  const scope = key(userId, result.orderId)
  if (uncertain.get(scope) === result.purpose && !result.supersededByNewerSession && ['Succeeded', 'Failed', 'Cancelled', 'Refunded'].includes(result.status)) {
    uncertain.delete(scope)
  }
}
