import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { merchantLockerApi } from './merchantLockerApi'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('uses one scoped snapshot and rejects inconsistent counts', async () => {
  const data = { totalLockers: 9, activeLockers: 5, maintenanceLockers: 3, inactiveLockers: 1, totalBoxes: 10, availableBoxes: 4, occupiedBoxes: 3, reservedBoxes: 2, maintenanceBoxes: 1 }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data } })
  expect(await merchantLockerApi.summary()).toMatchObject({ total: 9, active: 5, maintenance: 3, inactive: 1, totalBoxes: 10 })
  expect(authorizedAxios.get).toHaveBeenCalledExactlyOnceWith('/locker/summary', { signal: undefined })
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { ...data, totalBoxes: 99 } } })
  await expect(merchantLockerApi.summary()).rejects.toThrow()
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

it('keeps stable usage identity and nullable times without inventing occupancy', async () => {
  const row = { usageId: 'order:2', orderId: 'order', orderCode: 'WG', boxId: 'deleted-box', usageType: 2, putInAt: null, takenOutAt: null }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, list: [row], total: 1 } })
  expect((await merchantLockerApi.history('locker', { page: 1, take: 8 })).list).toEqual([row])
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, list: [row, row], total: 2 } })
  await expect(merchantLockerApi.history('locker', { page: 1, take: 8 })).rejects.toThrow()
})
