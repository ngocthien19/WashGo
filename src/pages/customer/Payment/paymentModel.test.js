import { describe, expect, it } from 'vitest'
import { onlinePaymentMethod, paymentBlockReason, paymentRedirectUrl, returnedOrderCode } from './paymentModel'

const order = { status: 8, paymentStatus: 1, includedWeightKg: 3, actualWeightKg: 3 }

describe('customer payment rules', () => {
  it('requires eligible lifecycle, unpaid status and final weighing', () => {
    expect(paymentBlockReason(order)).toBe('')
    expect(paymentBlockReason({ ...order, status: 13 })).toBe('')
    expect(paymentBlockReason({ ...order, status: 1 })).toBe('customer.payment.processingNote')
    expect(paymentBlockReason({ ...order, actualWeightKg: null })).toBe('customer.payment.waitingWeight')
    expect(paymentBlockReason({ ...order, includedWeightKg: null, actualWeightKg: null })).toBe('')
    expect(paymentBlockReason({ ...order, paymentStatus: 2 })).toBe('customer.payment.paid')
    expect(paymentBlockReason({ ...order, paymentStatus: 3 })).toBe('customer.payment.unavailable')
    expect(paymentBlockReason({ ...order, paymentStatus: undefined })).toBe('customer.payment.unavailable')
    expect([1, 2, 3, 4].map(onlinePaymentMethod)).toEqual([false, true, true, false])
  })

  it.each(['vnp_TxnRef', 'orderId'])('uses %s to locate an order, never to confirm payment', (key) => {
    for (const length of [16, 32]) {
      expect(returnedOrderCode(new URLSearchParams({ [key]: `WG-PAY-WG2611059288-${'a'.repeat(length)}`, vnp_ResponseCode: '00', resultCode: '0' }))).toBe('WG2611059288')
    }
    expect(returnedOrderCode(new URLSearchParams({ resultCode: '0', orderId: 'arbitrary-id' }))).toBe('')
  })

  it('rejects unsafe redirects and allows HTTPS gateways or local mock checkout', () => {
    expect(paymentRedirectUrl('https://sandbox.vnpayment.vn/pay?a=1')).toContain('https://sandbox.vnpayment.vn/')
    expect(paymentRedirectUrl('http://localhost:5000/payment/mock-checkout')).toContain('localhost:5000')
    for (const value of ['', '/local', 'javascript:alert(1)', 'data:text/html,hello', 'http://external.test', 'https://user:password@external.test']) {
      expect(() => paymentRedirectUrl(value)).toThrow('customer.payment.invalidResponse')
    }
  })
})
