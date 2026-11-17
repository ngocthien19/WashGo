import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { adminPaymentApi } from './adminPaymentApi'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('reads pending reconciliation with server pagination and explicit resolved filter', async () => {
  const row = { id: 'review-1', orderId: 'order-1', transactionReference: 'REF-1', amount: 80000, status: 5, sessionState: 3, purpose: 1 }
  const response = { succeeded: true, list: [row], total: 13, currentPage: 2 }
  authorizedAxios.get.mockResolvedValue({ data: response })
  expect(await adminPaymentApi.reconciliations(2, true)).toMatchObject({ list: [row], totalPages: 2 })
  expect(authorizedAxios.get).toHaveBeenCalledExactlyOnceWith('/payment/reconciliations', { params: { page: 2, take: 12, includeResolved: true }, signal: undefined })
  for (const patch of [{ amount: -1 }, { status: 99 }, { sessionState: 99 }, { purpose: 99 }]) {
    authorizedAxios.get.mockResolvedValue({ data: { ...response, list: [{ ...row, ...patch }] } })
    await expect(adminPaymentApi.reconciliations(2, true)).rejects.toThrow('admin.invalidResponse')
  }
})
