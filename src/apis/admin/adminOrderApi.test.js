import { expect, it, vi } from 'vitest'
import { adminOrderApi } from './adminOrderApi'
import authorizedAxios from '~/utils/authorizedAxios'
vi.mock('~/utils/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn(), put: vi.fn() } }))
const id = '11111111-1111-4111-8111-111111111111', merchantId = '22222222-2222-4222-8222-222222222222'
it('rejects a malformed successful assignment as an unknown outcome', async () => {
  authorizedAxios.post.mockReset().mockResolvedValueOnce({ data: { succeeded: true, data: { orderId: id, merchantId: id } } })
  await expect(adminOrderApi.assignMerchant(id, merchantId)).rejects.toMatchObject({ uncertain: true })
})
it('does not accept missing or duplicate batch results', async () => {
  authorizedAxios.post.mockReset().mockResolvedValueOnce({ data: { succeeded: true, data: [] } })
  await expect(adminOrderApi.autoAssign([{ orderId: id, merchantId }])).rejects.toMatchObject({ uncertain: true })
  expect(() => adminOrderApi.autoAssign([{ orderId: id, merchantId }, { orderId: id, merchantId }])).toThrow()
  expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
})
it('uses storage status13 and whitelists the transfer command', async () => {
  authorizedAxios.post.mockReset().mockResolvedValueOnce({ data: { succeeded: true, data: { id, status: 13 } } })
  await adminOrderApi.store(id, { storageLocation: ' Warehouse A ', storageReference: ' A01 ', note: '', actorId: 'spoof', status: 12 })
  expect(authorizedAxios.post).toHaveBeenCalledWith('/wash-order/move-to-storage', { orderId: id, storageLocation: 'Warehouse A', storageReference: 'A01', note: null })
})
it('lookup reads all pages and does not return a partial list after failure', async () => {
  authorizedAxios.post.mockReset().mockResolvedValueOnce({ data: { succeeded: true, list: [{ id, name: 'Locker A' }], total: 101 } }).mockRejectedValueOnce(new Error('lookup failed'))
  await expect(adminOrderApi.lookup('/locker/filter', 'name')).rejects.toThrow('lookup failed')
  expect(authorizedAxios.post).toHaveBeenNthCalledWith(2, '/locker/filter', { page: 2, take: 100 }, { signal: undefined })
})
