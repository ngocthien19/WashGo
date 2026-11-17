import { beforeEach, expect, it, vi } from 'vitest'
import { readCancellationSession, saveCancellationSession, clearCancellationSession } from './cancellationPaymentSession'

beforeEach(() => {
  localStorage.clear(); vi.restoreAllMocks()
})
it('remembers only method and review state for the correct user and order', () => {
  saveCancellationSession('customer-1', 'order-1', { method: 3, review: false, paymentUrl: 'secret-url', accessToken: 'secret-token' })
  expect(readCancellationSession('customer-1', 'order-1')).toEqual({ method: 3, review: false })
  expect(readCancellationSession('customer-2', 'order-1')).toBeNull()
  expect(readCancellationSession('customer-1', 'order-2')).toBeNull()
  expect(localStorage.getItem(localStorage.key(0))).not.toContain('secret')
  clearCancellationSession('customer-1', 'order-1')
  expect(readCancellationSession('customer-1', 'order-1')).toBeNull()
})
it('retains uncertainty without inventing the gateway on a method conflict', () => {
  saveCancellationSession('customer-review', 'order-1', { method: null, review: true })
  expect(readCancellationSession('customer-review', 'order-1')).toEqual({ method: null, review: true })
  saveCancellationSession('customer-review', 'order-2', { method: 1, review: false })
  expect(readCancellationSession('customer-review', 'order-2')).toBeNull()
  expect(readCancellationSession(null, 'order-1')).toBeNull()
})
it('falls back to memory when browser storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  saveCancellationSession('customer-private', 'order-1', { method: 2, review: true })
  expect(readCancellationSession('customer-private', 'order-1')).toEqual({ method: 2, review: true })
})
it('keeps an unsaved hint when writes are blocked, and rejects malformed persisted hints', () => {
  saveCancellationSession('customer-invalid', 'order-1', { method: 2, review: false })
  const key = 'washgo:cancellation-method:v1:customer-invalid:order-1'
  localStorage.setItem(key, 'malformed')
  expect(readCancellationSession('customer-invalid', 'order-1')).toBeNull()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  saveCancellationSession('customer-quota', 'order-1', { method: 3, review: false })
  expect(readCancellationSession('customer-quota', 'order-1')).toEqual({ method: 3, review: false })
})
