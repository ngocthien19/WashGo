import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantDashboardApi } from './merchantDashboardApi'
import { MERCHANT_DASHBOARD } from '~/utils/constants'
vi.mock('~/utils/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('counts the complete server-scoped result rather than the visible page and never sends merchant identity', async () => {
  authorizedAxios.post.mockImplementation(async (path, body) => ({ data: { succeeded: true, total: body.status ? body.status : 100, list: body.status ? [] : [{ id: 'a', orderCode: 'WG1', status: 4 }] } }))
  const data = await merchantDashboardApi.orders()
  expect(data.total).toBe(100)
  expect(data.recent).toHaveLength(1)
  expect(data.counts[12]).toBe(12)
  expect(authorizedAxios.post).toHaveBeenCalledTimes(MERCHANT_DASHBOARD.STATUSES.length + 1)
  for (const [path, body] of authorizedAxios.post.mock.calls) {
    expect(path).toBe('/wash-order/filter')
    expect(body).not.toHaveProperty('merchantId')
    expect(body).not.toHaveProperty('customerId')
  }
})
it('rejects malformed aggregation and does not turn an API failure into zero orders', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: false, list: [], total: 0 } })
  await expect(merchantDashboardApi.orders()).rejects.toThrow('merchant.invalidResponse')
  authorizedAxios.post.mockRejectedValue(new Error('offline'))
  await expect(merchantDashboardApi.orders()).rejects.toThrow('offline')
})
it('reads settlements only through the Merchant-authorized endpoint', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, total: 0, list: [] } })
  await merchantDashboardApi.settlements()
  expect(authorizedAxios.post).toHaveBeenCalledWith('/finance/settlements/filter', { page: 1, take: 4 }, expect.any(Object))
})
