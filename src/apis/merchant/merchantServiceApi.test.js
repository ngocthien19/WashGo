import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantServiceApi } from './merchantServiceApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('scopes list payloads without identity, unsupported sort or proposal keyword', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [], total: 25 } })
  const page = await merchantServiceApi.catalog({ page: 1, take: 12, isActive: false, merchantId: 'forbidden', sortBy: ['bad'] })
  expect(page.totalPages).toBe(3)
  expect(authorizedAxios.post.mock.calls[0][0]).toBe('/merchant-service/filter')
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ page: 1, take: 12, isActive: false })
  await merchantServiceApi.proposals({ page: 1, take: 12, keyword: 'unsupported', merchantId: 'forbidden' })
  expect(authorizedAxios.post.mock.calls[1][1]).toEqual({ page: 1, take: 12 })
})
it('uses six server totals and both correct endpoint scopes for summary', async () => {
  authorizedAxios.post.mockImplementation(async (url, body) => ({ data: { succeeded: true, list: [], total: url === '/merchant-service/filter' ? body.isActive === false ? 2 : body.isActive === true ? 8 : 10 : { 1: 3, 2: 4, 3: 1 }[body.status] } }))
  expect(await merchantServiceApi.summary()).toEqual({ total: 10, active: 8, inactive: 2, pending: 3, approved: 4, rejected: 1 })
})
it('whitelists proposal writes and locks malformed or wrong-service results', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { id: 'p', status: 1, serviceId: 's', requestType: 2, proposed: { name: 'Test' } } } })
  await merchantServiceApi.submit('s', { name: 'Test', unitPrice: 5, merchantId: 'spoof', isActive: false, approvalStatus: 2 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ name: 'Test', unitPrice: 5 })
  await expect(merchantServiceApi.submit('other', { name: 'Test' })).rejects.toMatchObject({ uncertain: true })
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { id: 'wrong', status: 1, proposed: { name: 'Test' } } } })
  await expect(merchantServiceApi.proposal('p')).rejects.toThrow('merchant.invalidResponse')
})
