import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantOrderApi } from './merchantOrderApi'

vi.mock('~/utils/authorizedAxios', () => ({ default: { post: vi.fn(), put: vi.fn(), get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const guard = { expectedRevision: 3, expectedStatus: 3, operationId: '11111111-1111-4111-8111-111111111111' }
it('whitelists staff filters and never sends customer/merchant identity or private column filters', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [], total: 25 } })
  const result = await merchantOrderApi.list({ page: 2, take: 12, merchantId: 'other', customerId: 'private', columnFilters: [{ field: 'CustomerName' }], status: 4 })
  expect(result.totalPages).toBe(3)
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('merchantId')
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('customerId')
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('columnFilters')
})
it('never submits actor identity or prices and treats unconfirmed mutation responses as uncertain', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: { id: 'order', orderCode: 'WG1', items: [], status: 4 } } })
  await merchantOrderApi.status('order', 4, 'Start washing', guard)
  expect(authorizedAxios.put.mock.calls[0][1]).toEqual({ orderId: 'order', newStatus: 4, note: 'Start washing', ...guard })
  await expect(merchantOrderApi.weigh('order', 5, guard)).rejects.toMatchObject({ uncertain: true })
  expect(authorizedAxios.put.mock.calls[1][1]).toEqual({ weightKg: 5, ...guard })
})

it('uses one scoped summary request and excludes status, identity and paging from it', async () => {
  const keys = ['pending', 'deposited', 'collected', 'washing', 'drying', 'ironing', 'folding', 'awaitingPayment', 'paid', 'readyToReturn', 'returned', 'completed', 'movedToStorage', 'cancelled']
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { total: 100, statusCounts: Object.fromEntries(keys.map((key) => [key, key === 'completed' ? 100 : 0])) } } })
  const filter = { fromDate: 100, toDate: 200, paymentStatus: 1, keyword: 'MC' }
  const result = await merchantOrderApi.summary({ ...filter, status: 4, merchantId: 'other', page: 2, take: 12 })
  expect(result.total).toBe(100)
  expect(result.counts[12]).toBe(100)
  expect(authorizedAxios.post).toHaveBeenCalledExactlyOnceWith('/wash-order/summary', filter, { signal: undefined })
})
it('does not write without a safe revision and operation ID', async () => {
  await expect(merchantOrderApi.status('order', 4, null)).rejects.toThrow('merchant.orderSync.missingVersion')
  expect(authorizedAxios.put).not.toHaveBeenCalled()
})
it('allows a confirmed replay even if the order has since advanced', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: { id: 'order', orderCode: 'WG', items: [], status: 8 }, meta: { replayed: true, operationId: guard.operationId } } })
  expect((await merchantOrderApi.status('order', 4, null, guard)).status).toBe(8)
})
it('checks operation identity and kind, and only treats 404 as not recorded', async () => {
  const dto = { orderId: 'order', operationId: guard.operationId, operation: 'UpdateWeight', resultRevision: 4 }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: dto } })
  expect(await merchantOrderApi.operation('order', guard.operationId, 'UpdateWeight')).toEqual(dto)
  await expect(merchantOrderApi.operation('other', guard.operationId, 'UpdateWeight')).rejects.toThrow('merchant.invalidResponse')
  await expect(merchantOrderApi.operation('order', guard.operationId, 'AssignShipper')).rejects.toThrow('merchant.invalidResponse')
  authorizedAxios.get.mockRejectedValueOnce({ response: { status: 404 } }).mockRejectedValueOnce({ response: { status: 500 } })
  expect(await merchantOrderApi.operation('order', guard.operationId, 'UpdateWeight')).toBeNull()
  await expect(merchantOrderApi.operation('order', guard.operationId, 'UpdateWeight')).rejects.toMatchObject({ response: { status: 500 } })
})
it('rejects summary fields that would invent zeros or disagree with the total', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { total: 0, statusCounts: {} } } })
  await expect(merchantOrderApi.summary({})).rejects.toThrow('merchant.invalidResponse')
})
