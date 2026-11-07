import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantLockerApi } from './merchantLockerApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('uses scoped totals rather than the current page for locker statistics', async () => {
  authorizedAxios.post.mockImplementation(async (url, body) => ({ data: { succeeded: true, total: body.status ? { 1: 5, 2: 3, 3: 1 }[body.status] : 9, list: [] } }))
  expect(await merchantLockerApi.summary()).toEqual({ total: 9, active: 5, maintenance: 3, inactive: 1 })
  expect(authorizedAxios.post).toHaveBeenCalledTimes(4)
})
it('whitelists list and history parameters without identity or write fields', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, total: 25, list: [] } })
  const data = await merchantLockerApi.list({ page: 2, take: 12, status: 2, merchantId: 'forbidden' })
  expect(data.totalPages).toBe(3)
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('merchantId')
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, total: 0, list: [] } })
  await merchantLockerApi.history('locker', { page: 1, take: 8, boxId: 'box', fromDate: 100, merchantId: 'forbidden' })
  expect(authorizedAxios.get.mock.calls[0][1].params).toEqual({ page: 1, take: 8, boxId: 'box', fromDate: 100, toDate: undefined })
})
it('rejects wrong-id details and malformed usage responses', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { id: 'other' } } })
  await expect(merchantLockerApi.detail('locker')).rejects.toThrow('merchant.invalidResponse')
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, total: 1, list: [{ orderId: 'order', orderCode: 'WG', usageType: 99 }] } })
  await expect(merchantLockerApi.history('locker', { page: 1, take: 8 })).rejects.toThrow('merchant.invalidResponse')
})
