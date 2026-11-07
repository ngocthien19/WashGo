import { beforeEach, it, expect, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantShipperApi } from './merchantShipperApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const response = (data) => ({ data: { succeeded: true, data } })
it('loads one scoped summary and rejects inconsistent counts', async () => {
  const counts = { total: 25, working: 20, onLeave: 5, available: 12, busy: 8, offline: 5, locked: 2 }
  authorizedAxios.get.mockResolvedValue(response(counts))
  expect(await merchantShipperApi.summary()).toEqual(counts)
  expect(authorizedAxios.get).toHaveBeenCalledExactlyOnceWith('/shipper/summary', { signal: undefined })
  authorizedAxios.get.mockResolvedValue(response({ ...counts, total: 24 }))
  await expect(merchantShipperApi.summary()).rejects.toThrow()
})
it('preserves false and rating sort but excludes ownership', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [], total: 25 } })
  const filter = { status: 2, isActive: false, page: 2, take: 12, sortBy: [{ field: 'Rating', isDescending: true }] }
  expect((await merchantShipperApi.list({ ...filter, merchantId: 'bad' })).totalPages).toBe(3)
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual(filter)
})
it('updates identity with revision but excludes roles and operating status', async () => {
  authorizedAxios.put.mockResolvedValue(response({ id: 's', fullName: 'Driver', isActive: true }))
  await merchantShipperApi.update('s', { fullName: 'Driver', expectedRevision: 3, identityNumber: '', identityFrontImageUrl: '', identityBackImageUrl: '', merchantId: 'bad', status: 3, role: 'Admin' })
  expect(authorizedAxios.put.mock.calls[0][1]).toEqual({ fullName: 'Driver', expectedRevision: 3, identityNumber: '', identityFrontImageUrl: '', identityBackImageUrl: '' })
  expect(() => merchantShipperApi.update('s', {})).toThrow()
})
it('treats malformed saves as uncertain', async () => {
  authorizedAxios.post.mockResolvedValue(response(null))
  await expect(merchantShipperApi.create({ fullName: 'Driver' })).rejects.toMatchObject({ uncertain: true })
})
it('accepts unlock without meta and sends delete reason separately', async () => {
  authorizedAxios.post.mockResolvedValue(response({ id: 's', accountActive: true }))
  await merchantShipperApi.account('unlock', 's', null)
  authorizedAxios.delete.mockResolvedValue({ data: { succeeded: true, data: null, meta: { code: 'Deleted' } } })
  await merchantShipperApi.account('delete', 's', 'Inactive')
  expect(authorizedAxios.delete).toHaveBeenCalledWith('/shipper/s', { params: { reason: 'Inactive' } })
})
it('keeps partial batch results and rejects mismatched IDs', async () => {
  const batch = { succeeded: 1, failed: 1, results: [{ shipperId: 'a', succeeded: true, code: 'Locked' }, { shipperId: 'b', succeeded: false, code: 'HasActiveTasks' }] }
  authorizedAxios.post.mockResolvedValue(response(batch))
  expect(await merchantShipperApi.batch('lock', ['a', 'b'], 'Review')).toEqual(batch)
  await expect(merchantShipperApi.batch('lock', ['a', 'c'], 'Review')).rejects.toMatchObject({ uncertain: true })
})
it('uses scoped task history with actual nullable milestones and paging', async () => {
  const task = { taskId: 't', orderId: 'o', taskType: 1, status: 1, assignedAt: null }
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [task], total: 13 } })
  const result = await merchantShipperApi.tasks('s', { page: 2, take: 6, status: 1 })
  expect(result.totalPages).toBe(3)
  expect(result.list[0].assignedAt).toBeNull()
  expect(authorizedAxios.post.mock.calls[0][0]).toBe('/shipper/s/tasks')
})
it('unlocks selected accounts through existing endpoints and reports each failure without retry', async () => {
  authorizedAxios.post.mockImplementation(async (path) => {
    if (path === '/shipper/a/unlock') {
      return response({ id: 'a', accountActive: true })
    }
    throw { response: { status: 403, data: { meta: { code: 'NotFound' } } } }
  })
  expect(await merchantShipperApi.batch('unlock', ['a', 'b', 'a'], '')).toMatchObject({ succeeded: 1, failed: 1, results: [{ shipperId: 'a', succeeded: true }, { shipperId: 'b', succeeded: false, code: 'NotFound' }] })
  expect(authorizedAxios.post).toHaveBeenCalledTimes(2)
})
