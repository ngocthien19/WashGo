import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantServiceApi } from './merchantServiceApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('scopes list payloads and passes supported server filters', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [], total: 25 } })
  const page = await merchantServiceApi.catalog({ page: 1, take: 12, isActive: false, merchantId: 'forbidden', sortBy: [{ field: 'UnitPrice', isDescending: true }] })
  expect(page.totalPages).toBe(3)
  expect(authorizedAxios.post.mock.calls[0][0]).toBe('/merchant-service/filter')
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ page: 1, take: 12, isActive: false, sortBy: [{ field: 'UnitPrice', isDescending: true }] })
  await merchantServiceApi.proposals({ page: 1, take: 12, keyword: 'service', merchantId: 'forbidden' })
  expect(authorizedAxios.post.mock.calls[1][1]).toEqual({ page: 1, take: 12, keyword: 'service' })
})
it('uses one snapshot for shared catalog and own proposals, rejects inconsistent totals', async () => {
  const value = { totalServices: 10, activeServices: 8, inactiveServices: 2, pendingProposals: 3, approvedProposals: 4, rejectedProposals: 1 }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: value } })
  expect(await merchantServiceApi.summary()).toEqual({ total: 10, active: 8, inactive: 2, pending: 3, approved: 4, rejected: 1 })
  expect(authorizedAxios.get).toHaveBeenCalledExactlyOnceWith('/merchant-service/summary', { signal: undefined })
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { ...value, totalServices: 99 } } })
  await expect(merchantServiceApi.summary()).rejects.toThrow()
})
it('whitelists proposal writes and locks malformed or wrong-service results', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { id: 'p', status: 1, serviceId: 's', requestType: 2, proposed: { name: 'Test' } } } })
  await merchantServiceApi.submit('s', { name: 'Test', unitPrice: 5, expectedVersion: 'v1', clientRequestId: 'request', merchantId: 'spoof', isActive: false, approvalStatus: 2 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ name: 'Test', unitPrice: 5, expectedVersion: 'v1', clientRequestId: 'request' })
  await expect(merchantServiceApi.submit('other', { name: 'Test', expectedVersion: 'v1', clientRequestId: 'request' })).rejects.toMatchObject({ uncertain: true })
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { id: 'wrong', status: 1, proposed: { name: 'Test' } } } })
  await expect(merchantServiceApi.proposal('p')).rejects.toThrow('merchant.invalidResponse')
})

it('reads exact service detail without a catalog search and rejects another ID', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { id: 's', code: 'SVC', name: 'Test', isActive: false, version: 'v1', imageUrls: ['admin-photo'], canProposeUpdate: false } } })
  expect(await merchantServiceApi.service('s')).toMatchObject({ version: 'v1', imageUrls: ['admin-photo'] })
  expect(authorizedAxios.get).toHaveBeenCalledExactlyOnceWith('/merchant-service/s', { signal: undefined })
  expect(authorizedAxios.post).not.toHaveBeenCalled()
  await expect(merchantServiceApi.service('other')).rejects.toThrow()
})
it('keeps image null semantics and accepts replay of an already reviewed create', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, meta: { replayed: true }, data: { id: 'p', requestType: 1, status: 2, serviceId: 'created-service', proposed: { name: 'Test' } } } })
  expect((await merchantServiceApi.submit(null, { name: 'Test', imageUrls: null, clientRequestId: 'request' })).status).toBe(2)
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ name: 'Test', imageUrls: null, clientRequestId: 'request' })
  await expect(merchantServiceApi.submit('s', { clientRequestId: 'request' })).rejects.toThrow()
})
