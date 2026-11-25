import { expect, it } from 'vitest'
import { validSummary, sessionContext } from './combinedPaymentModel'
const orderId = '11111111-1111-4111-8111-111111111111'
const summary = { orderId, currency: 'VND', outstanding: 230000, settled: false, canRequestStorageReturn: false, obligations: [{ purpose: 1, due: 130000, paid: 0, outstanding: 130000 }, { purpose: 2, due: 100000, paid: 0, outstanding: 100000 }], quote: { orderId, purpose: 4, cashAmount: 230000, pointsToRedeem: 0, maximumPoints: 0, canCreate: true, quoteToken: 'quote', methods: [{ paymentMethod: 2, enabled: true }] } }
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
