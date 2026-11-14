import { expect, it, vi } from 'vitest'
import { adminOrderApi } from './adminOrderApi'
import authorizedAxios from '~/utils/http/authorizedAxios'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn(), put: vi.fn() } }))
const id = '11111111-1111-4111-8111-111111111111', merchantId = '22222222-2222-4222-8222-222222222222'
it('rejects a malformed successful assignment as an unknown outcome', async () => {
  authorizedAxios.post.mockReset().mockResolvedValueOnce({ data: { succeeded: true, data: { orderId: id, merchantId: id } } })
  await expect(adminOrderApi.assignMerchant(id, merchantId, { expectedRevision: 1, expectedCommissionRate: 0 })).rejects.toMatchObject({ uncertain: true })
})
it('does not accept missing or duplicate batch results', async () => {
  authorizedAxios.post.mockReset().mockResolvedValueOnce({ data: { succeeded: true, data: [] } })
  await expect(adminOrderApi.autoAssign([{ orderId: id, merchantId, expectedRevision: 1, expectedCommissionRate: 0 }])).rejects.toMatchObject({ uncertain: true })
  expect(() => adminOrderApi.autoAssign([{ orderId: id, merchantId, expectedRevision: 1, expectedCommissionRate: 0 }, { orderId: id, merchantId, expectedRevision: 1, expectedCommissionRate: 0 }])).toThrow()
  expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
})
it('lookup reads all pages and does not return a partial list after failure', async () => {
  authorizedAxios.get.mockReset().mockResolvedValueOnce({ data: { succeeded: true, list: [{ id, name: 'Locker A' }], total: 101 } }).mockRejectedValueOnce(new Error('lookup failed'))
  await expect(adminOrderApi.lookup('/locker/filter', 'name')).rejects.toThrow('lookup failed')
  expect(authorizedAxios.get).toHaveBeenNthCalledWith(2, '/admin/lookups/lockers', { params: { page: 2, take: 50 }, signal: undefined })
})
