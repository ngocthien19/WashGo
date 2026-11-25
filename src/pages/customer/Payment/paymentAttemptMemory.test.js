import { expect, it } from 'vitest'
import { paymentIsUncertain, rememberUncertainPayment, resolveUncertainPayment } from './paymentAttemptMemory'
it('retains unknown outcomes across modal remounts and resolves only the matching authoritative attempt', () => {
  rememberUncertainPayment('customer', 'order', 4)
  expect(paymentIsUncertain('customer', 'order')).toBe(true)
  expect(paymentIsUncertain('other-customer', 'order')).toBe(false)
  resolveUncertainPayment('customer', { orderId: 'order', purpose: 1, status: 'Succeeded' })
  resolveUncertainPayment('customer', { orderId: 'order', purpose: 4, status: 'Pending' })
  expect(paymentIsUncertain('customer', 'order')).toBe(true)
  resolveUncertainPayment('customer', { orderId: 'order', purpose: 4, status: 'Failed' })
  expect(paymentIsUncertain('customer', 'order')).toBe(false)
})
