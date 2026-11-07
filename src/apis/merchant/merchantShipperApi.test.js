import { beforeEach, it, expect, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantShipperApi } from './merchantShipperApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('loads team-wide counts from server totals and preserves independent state filters', async () => {
  authorizedAxios.post.mockImplementation(async (url, filter) => ({ data: { succeeded: true, list: [], total: filter.status ? { 1: 12, 2: 8, 3: 5 }[filter.status] : filter.isActive === false ? 5 : filter.isActive === true ? 20 : 25 } }))
  expect(await merchantShipperApi.summary()).toEqual({ total: 25, working: 20, onLeave: 5, available: 12, busy: 8, offline: 5 })
  expect(authorizedAxios.post).toHaveBeenCalledTimes(6)
  for (const [, filter] of authorizedAxios.post.mock.calls) {
    expect(filter).toMatchObject({ page: 1, take: 1 })
    expect(filter).not.toHaveProperty('merchantId')
    expect(filter).not.toHaveProperty('keyword')
  }
})
it('sends only scoped filters, preserves false and derives paging from server total', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [], total: 25 } })
  const data = await merchantShipperApi.list({ merchantId: 'forbidden', status: 2, isActive: false, page: 2, take: 12 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ status: 2, isActive: false, page: 2, take: 12 })
  expect(data.totalPages).toBe(3)
})
it('does not send identity changes, roles or ownership in update', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: { id: 's', fullName: 'Driver', isActive: true } } })
  await merchantShipperApi.update('s', { fullName: 'Driver', isActive: false, merchantId: 'bad', identityNumber: 'secret', status: 3, role: 'Admin' })
  expect(authorizedAxios.put.mock.calls[0][1]).toEqual({ fullName: 'Driver', isActive: false })
})
it('treats malformed save responses as uncertain', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: null } })
  await expect(merchantShipperApi.create({ fullName: 'Driver' })).rejects.toMatchObject({ uncertain: true })
})
