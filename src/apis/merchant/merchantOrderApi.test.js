import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantOrderApi } from './merchantOrderApi'

vi.mock('~/utils/authorizedAxios', () => ({ default: { post: vi.fn(), put: vi.fn(), get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('whitelists staff filters and never sends customer/merchant identity or private column filters', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [], total: 25 } })
  const result = await merchantOrderApi.list({ page: 2, take: 12, merchantId: 'other', customerId: 'private', columnFilters: [{ field: 'CustomerName' }], status: 4 })
  expect(result.totalPages).toBe(3)
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('merchantId')
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('customerId')
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('columnFilters')
})
it('never submits actor identity or prices and treats unconfirmed mutation responses as uncertain', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: { id: 'order', orderCode: 'WG1', items: [], status: 4 } } })
  await merchantOrderApi.status('order', 4, 'Start washing')
  expect(authorizedAxios.put.mock.calls[0][1]).toEqual({ orderId: 'order', newStatus: 4, note: 'Start washing' })
  await expect(merchantOrderApi.weigh('order', 5)).rejects.toMatchObject({ uncertain: true })
  expect(authorizedAxios.put.mock.calls[1][1]).toEqual({ weightKg: 5 })
})

it('applies the same date/payment/search scope to all server totals without counting the visible page', async () => {
  authorizedAxios.post.mockImplementation(async (_, body) => ({ data: { succeeded: true, list: [], total: body.status || 100 } }))
  const result = await merchantOrderApi.summary({ fromDate: 1793984400, toDate: 1794070799, paymentStatus: 1, keyword: 'WG', status: 4, merchantId: 'other' })
  expect(result.total).toBe(100)
  expect(result.counts[12]).toBe(12)
  expect(authorizedAxios.post).toHaveBeenCalledTimes(15)
  for (const [, body] of authorizedAxios.post.mock.calls) {
    expect(body).toMatchObject({ fromDate: 1793984400, toDate: 1794070799, paymentStatus: 1, keyword: 'WG', page: 1, take: 1 })
    expect(body).not.toHaveProperty('merchantId')
  }
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('status')
})
