import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { adminLockerApi } from './adminLockerApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
const id = '11111111-1111-4111-8111-111111111111'
const locker = { id, code: 'LK01', name: 'Station', status: 1 }
beforeEach(() => vi.clearAllMocks())
it('whitelists Admin list filters and never transmits arbitrary column filters or actor identity', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [locker], total: 25 } })
  expect(await adminLockerApi.list({ page: 2, take: 12, merchantId: id, city: 'City', actorId: id, columnFilters: ['secret'] })).toMatchObject({ currentPage: 2, totalPages: 3 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ page: 2, take: 12, merchantId: id, city: 'City' })
})
it('only writes supported fields and treats a malformed success as an unknown result', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: locker } })
  await adminLockerApi.update({ id, expectedVersion: 'v1', status: 1, name: 'Station', merchantIds: null, code: 'ignored', boxes: [1], operationId: 'unsupported', role: 'Admin' })
  expect(authorizedAxios.put.mock.calls[0]).toEqual(['/locker', expect.objectContaining({ id, status: 1, name: 'Station', merchantIds: null, expectedVersion: 'v1', operationId: expect.any(String) })])
  expect(authorizedAxios.put.mock.calls[0][1]).not.toHaveProperty('boxes')
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: { ...locker, id: 'wrong' } } })
  await expect(adminLockerApi.update({ id, expectedVersion: 'v1', status: 1 })).rejects.toMatchObject({ uncertain: true })
})
it('loads all Merchant pages and uses the existing City distinct endpoint', async () => {
  authorizedAxios.get.mockResolvedValueOnce({ data: { succeeded: true, list: [{ id, name: 'Store 1', status: 1 }], total: 2 } }).mockResolvedValueOnce({ data: { succeeded: true, list: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Store 2', status: 1 }], total: 2 } })
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: [{ value: 'City' }, { value: '' }, { value: 'City' }] } })
  expect(await adminLockerApi.merchants()).toHaveLength(2)
  expect(await adminLockerApi.cities()).toEqual(['City'])
  expect(authorizedAxios.post).toHaveBeenLastCalledWith('/locker/column-distinct-values', { page: 1, take: 100 }, { params: { field: 'City' }, signal: undefined })
})
it('requires explicit true for delete and box-status write acknowledgements', async () => {
  authorizedAxios.delete.mockResolvedValue({ data: { succeeded: true, data: false } })
  await expect(adminLockerApi.remove(id, 'v1')).rejects.toMatchObject({ uncertain: true })
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: true } })
  await adminLockerApi.boxStatus({ lockerId: id, boxId: id, expectedVersion: 'v1', newStatus: 4, hasItems: false })
  expect(authorizedAxios.put).toHaveBeenCalledWith('/locker/box-status', expect.objectContaining({ lockerId: id, boxId: id, newStatus: 4, expectedVersion: 'v1', operationId: expect.any(String) }))
})
