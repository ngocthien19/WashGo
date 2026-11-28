const money = value => Number.isFinite(value) && value >= 0
export function checkoutAmounts(summary) {
  const quote = summary.quote
  const session = quote.activeSession
  const hasSessionAmounts = session && [2, 3].includes(session.paymentMethod) && money(session.amount)
    && Number.isSafeInteger(session.pointsToRedeem) && session.pointsToRedeem >= 0
  return hasSessionAmounts
    ? { cashAmount: session.amount, pointsToRedeem: session.pointsToRedeem }
    : { cashAmount: quote.cashAmount, pointsToRedeem: quote.pointsToRedeem }
}

export function orderPaymentAmounts(summary) {
  const session = summary.quote?.activeSession
  const serviceDue = summary.obligations?.find(row => row.purpose === 1)?.outstanding ?? 0
  const points = !summary.settled && [1, 4].includes(session?.purpose)
    && [2, 3].includes(session.paymentMethod) && money(session.amount)
    && Number.isSafeInteger(session.pointsToRedeem) && session.pointsToRedeem > 0 && session.pointsToRedeem <= serviceDue
    ? session.pointsToRedeem : 0
  // BE uses 1 point = 1 VND. Keep all outstanding fees, even when the
  // existing session only covers the service portion of the order.
  return { pointsToRedeem: points, cashAmount: Math.max(0, summary.outstanding - points) }
}

export function validSummary(value, orderId) {
  return value?.orderId === orderId && value.currency === 'VND' && money(value.outstanding)
    && typeof value.settled === 'boolean' && typeof value.canRequestStorageReturn === 'boolean'
    && Array.isArray(value.obligations) && new Set(value.obligations.map(row => row.purpose)).size === value.obligations.length
    && value.obligations.every(row => [1, 2, 3].includes(row.purpose) && ['due', 'paid', 'outstanding'].every(key => money(row[key])))
    && value.quote?.orderId === orderId && value.quote.purpose === 4 && money(value.quote.cashAmount)
    && Number.isSafeInteger(value.quote.pointsToRedeem) && value.quote.pointsToRedeem >= 0
    && Number.isSafeInteger(value.quote.maximumPoints) && value.quote.maximumPoints >= 0
    && typeof value.quote.canCreate === 'boolean' && typeof value.quote.quoteToken === 'string'
    && (!value.quote.canCreate || value.quote.quoteToken.length > 0)
    && (!value.quote.activeSession || value.quote.activeSession.orderId === orderId && [1, 2, 3, 4].includes(value.quote.activeSession.purpose)
      && (!value.quote.activeSession.canContinue || [2, 3].includes(value.quote.activeSession.paymentMethod) && money(value.quote.activeSession.amount) && Number.isSafeInteger(value.quote.activeSession.pointsToRedeem) && value.quote.activeSession.pointsToRedeem >= 0))
    && Array.isArray(value.quote.methods) && value.quote.methods.every(row => [2, 3].includes(row.paymentMethod) && typeof row.enabled === 'boolean')
}
export const sessionContext = (orderId, session) => session && [1, 2, 3, 4].includes(session.purpose)
  ? { orderId, purpose: session.purpose, ...(session.sessionId ? { sessionId: session.sessionId } : {}) } : null
