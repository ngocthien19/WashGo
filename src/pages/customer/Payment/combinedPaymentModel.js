const money = value => Number.isFinite(value) && value >= 0
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
