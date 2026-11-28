import { expect, it } from 'vitest'
import { checkoutAmounts, orderPaymentAmounts, validSummary, sessionContext } from './combinedPaymentModel'
const orderId = '11111111-1111-4111-8111-111111111111'
const summary = { orderId, currency: 'VND', outstanding: 230000, settled: false, canRequestStorageReturn: false, obligations: [{ purpose: 1, due: 130000, paid: 0, outstanding: 130000 }, { purpose: 2, due: 100000, paid: 0, outstanding: 100000 }], quote: { orderId, purpose: 4, cashAmount: 230000, pointsToRedeem: 0, maximumPoints: 0, canCreate: true, quoteToken: 'quote', methods: [{ paymentMethod: 2, enabled: true }] } }
it('does not treat an ambiguous session without gateway amounts as a zero-value payment', () => {
  const value = { ...summary, quote: { ...summary.quote, activeSession: { canContinue: false, reasonCode: 'MultipleSessionsRequireReview', amount: 0, pointsToRedeem: 0 } } }
  expect(checkoutAmounts(value)).toEqual({ cashAmount: 230000, pointsToRedeem: 0 })
})
it('subtracts held service points once while retaining fees outside the existing session', () => {
  const value = { ...summary, quote: { ...summary.quote, activeSession: { purpose: 1, paymentMethod: 2, amount: 129200, pointsToRedeem: 800, canContinue: false } } }
  expect(orderPaymentAmounts(value)).toEqual({ cashAmount: 229200, pointsToRedeem: 800 })
  expect(orderPaymentAmounts({ ...value, settled: true }).pointsToRedeem).toBe(0)
  expect(orderPaymentAmounts({ ...summary, quote: { ...summary.quote, pointsToRedeem: 800, cashAmount: 229200 } })).toEqual({ cashAmount: 230000, pointsToRedeem: 0 })
  expect(orderPaymentAmounts({ ...value, obligations: [{ purpose: 1, outstanding: 0 }] }).pointsToRedeem).toBe(0)
})
it('accepts server combined balances without deriving them from historical fees', () => {
  expect(validSummary(summary, orderId)).toBe(true)
  for (const patch of [{ orderId: 'other' }, { outstanding: -1 }, { obligations: [...summary.obligations, summary.obligations[0]] }, { quote: { ...summary.quote, purpose: 1 } }]) {
    expect(validSummary({ ...summary, ...patch }, orderId)).toBe(false)
  }
})
it('preserves actual purpose of overlapping legacy and combined sessions', () => {
  for (const purpose of [1, 2, 3, 4]) {
    expect(sessionContext(orderId, { purpose, sessionId: 'opaque' })).toEqual({ orderId, purpose, sessionId: 'opaque' })
  }
  expect(sessionContext(orderId, { purpose: 9 })).toBeNull()
})
