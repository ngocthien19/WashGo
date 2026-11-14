import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { shipperDeliveryApi } from './shipperDeliveryApi'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { post: vi.fn() } }))
const row = { eventId: 'event-1', orderId: 'order-1', orderCode: 'WG1', taskType: 1, lockerName: 'Locker', completedAt: '2026-11-09T01:00:00Z', orderStatus: 12 }
beforeEach(() => vi.clearAllMocks())
it('paginates by server totals and sends only the supported scoped query', async () => {
  const signal = new AbortController().signal
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [row], total: 30 } })
  const result = await shipperDeliveryApi.list({ fromDate: 100, toDate: 200, taskType: 2, page: 3, take: 12, shipperId: 'other', keyword: 'fake', sortBy: 'fake' }, signal)
  expect(authorizedAxios.post).toHaveBeenCalledWith('/shipper-delivery/history', { fromDate: 100, toDate: 200, taskType: 2, page: 3, take: 12, keyword: 'fake', sortBy: 'fake' }, { signal })
  expect(result).toEqual({ list: [row], total: 30, currentPage: 3, totalPages: 3 })
})
it('preserves separate collect and return events for the same order', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [row, { ...row, taskType: 2 }], total: 2 } })
  expect((await shipperDeliveryApi.list()).list).toHaveLength(2)
})
it('accepts empty pages but rejects malformed events and broken counts', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [], total: 0 } })
  expect((await shipperDeliveryApi.list()).totalPages).toBe(0)
  for (const value of [{ list: [row], total: 0 }, { list: [{ ...row, completedAt: 'bad' }], total: 1 }, { list: [{ ...row, taskType: 5 }], total: 1 }, { total: 1 }]) {
    authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, ...value } })
    await expect(shipperDeliveryApi.list()).rejects.toThrow('shipper.invalidResponse')
  }
})
