import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { merchantDashboardApi } from './merchantDashboardApi'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('loads all dashboard totals, orders and settlements from one scoped endpoint', async () => {
  const keys = ['pending', 'deposited', 'collected', 'washing', 'drying', 'ironing', 'folding', 'awaitingPayment', 'paid', 'readyToReturn', 'returned', 'completed', 'movedToStorage', 'cancelled']
  const statusCounts = Object.fromEntries(keys.map((key, index) => [key, index === 11 ? 12 : 0]))
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { totalOrders: 12, statusCounts, latestOrders: [{ id: 'a', orderCode: 'WG1', status: 4 }], recentSettlements: [{ id: 's', payoutAmount: 100 }], generatedAt: '2026-11-07T10:00:00' } } })
  const signal = new AbortController().signal
  const data = await merchantDashboardApi.orders(signal)
  expect(data.total).toBe(12)
  expect(data.counts[12]).toBe(12)
  expect(data.recent).toHaveLength(1)
  expect(data.settlements).toHaveLength(1)
  expect(authorizedAxios.get).toHaveBeenCalledExactlyOnceWith('/merchant/dashboard', { params: { period: 'all' }, signal })
  expect(authorizedAxios.post).not.toHaveBeenCalled()
})
it('rejects incomplete dashboard snapshots and surfaces service errors', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { totalOrders: 0, statusCounts: {}, latestOrders: [], recentSettlements: [] } } })
  await expect(merchantDashboardApi.orders()).rejects.toThrow('merchant.invalidResponse')
  authorizedAxios.get.mockRejectedValue(new Error('offline'))
  await expect(merchantDashboardApi.orders()).rejects.toThrow('offline')
})
it('reads settlements only through the Merchant-authorized endpoint', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, total: 0, list: [] } })
  await merchantDashboardApi.settlements()
  expect(authorizedAxios.post).toHaveBeenCalledWith('/finance/settlements/filter', { page: 1, take: 4 }, expect.any(Object))
})
