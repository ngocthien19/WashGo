import { expect, it } from 'vitest'
import { paymentContext, safePaymentReturn, validOutcome } from './paymentOutcome'
const orderId = '11111111-1111-4111-8111-111111111111', sessionId = '22222222-2222-4222-8222-222222222222'
const context = { orderId, purpose: 2, sessionId }
const value = { ...context, status: 'Succeeded', resultPage: 'success', verified: true, obligationSettled: true, capabilities: { canVerify: false, canContinue: false, canRetry: false, canViewOrder: true } }
it('rejects forged success, wrong purpose and a different payment attempt', () => {
  expect(validOutcome(value, context)).toBe(true)
  for (const patch of [{ verified: false }, { purpose: 1 }, { sessionId: orderId }, { status: 'Pending' }]) {
    expect(validOutcome({ ...value, ...patch }, context)).toBe(false)
  }
})
it('preserves only validated return identifiers across login', () => {
  const query = new URLSearchParams(context)
  expect(paymentContext(query)).toEqual(context)
  expect(safePaymentReturn(`/payment/success?${query}&vnp_SecureHash=secret&resultCode=0`)).toBe(`/payment/success?${query}`)
  expect(safePaymentReturn('https://evil.test/payment/success')).toBeNull()
  expect(paymentContext(new URLSearchParams({ orderId, purpose: 4 }))).toEqual({ orderId, purpose: 4 })
  expect(validOutcome({ ...value, obligationSettled: false }, context)).toBe(true)
  expect(safePaymentReturn(`/orders/${orderId}?${new URLSearchParams(context)}&vnp_SecureHash=discard`)).toBe(`/orders/${orderId}?${new URLSearchParams(context)}`)
  expect(safePaymentReturn(`/orders/${sessionId}?${query}`)).toBeNull()
  expect(paymentContext(new URLSearchParams({ orderId, purpose: 1, sessionId: '../wrong' }))).toBeNull()
})
