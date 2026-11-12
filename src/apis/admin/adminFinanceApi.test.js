import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { adminFinanceApi } from './adminFinanceApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
const id = 'a0000000-0000-4000-8000-000000000001', merchantId = 'b0000000-0000-4000-8000-000000000001'
const row = { id, merchantId, merchantName: 'Store', periodFrom: '2026-10-01T00:00:00Z', periodTo: '2026-10-31T00:00:00Z', grossRevenue: 100000, refundedAmount: 0, netRevenue: 100000, commissionRate: 20, commissionAmount: 20000, payoutAmount: 80000, status: 1, orderCount: 1 }
const refund = { id, orderId: id, customerId: id, amount: 30000, status: 1, reason: 'Cancelled' }
beforeEach(() => vi.clearAllMocks())
it('settlement filters include supported period and keyword fields', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [row], total: 13 } })
  expect(await adminFinanceApi.settlements({ page: 2, take: 12, merchantId, status: 1, fromDate: 123, keyword: 'fake' })).toMatchObject({ totalPages: 2 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ page: 2, take: 12, merchantId, status: 1, fromDate: 123, keyword: 'fake' })
})
it('reads settlement details directly without scanning the Merchant list', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: row } })
  expect(await adminFinanceApi.settlement(row)).toEqual(row)
  expect(authorizedAxios.get).toHaveBeenCalledWith(`/finance/settlements/${id}`, { signal: undefined })
  expect(authorizedAxios.post).not.toHaveBeenCalled()
})
it('creates only with period and Merchant, validates the frozen response boundaries', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: row } })
  const body = { quoteToken: 'quote-1', merchantId, fromDate: Date.parse(row.periodFrom) / 1000, toDate: Date.parse(row.periodTo) / 1000, payoutAmount: 1, status: 2, actorId: id }
  await adminFinanceApi.create(body)
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ merchantId, fromDate: body.fromDate, toDate: body.toDate, quoteToken: 'quote-1', operationId: expect.any(String) })
  await expect(adminFinanceApi.create({ ...body, toDate: body.toDate + 1 })).rejects.toMatchObject({ uncertain: true })
})
it('verifies payout/refund acknowledgements and refuses another reference on replay', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { ...row, status: 2, paymentReference: 'OTHER' } } })
  await expect(adminFinanceApi.pay(id, 'BANK123', 'v1')).rejects.toMatchObject({ uncertain: true })
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { ...refund, status: 2 } } })
  await adminFinanceApi.review(id, true, 'Verified', 'v1')
  expect(authorizedAxios.post).toHaveBeenLastCalledWith(`/payment/refund-requests/${id}/review`, expect.objectContaining({ approve: true, reviewNote: 'Verified', expectedVersion: 'v1', operationId: expect.any(String) }))
  await expect(adminFinanceApi.confirmRefund(id, 'BANK123', 'v1')).rejects.toMatchObject({ uncertain: true })
})
it('validates real CSV blobs and server-paged refund response contracts', async () => {
  authorizedAxios.post.mockResolvedValue({ data: new Blob(['{}']), headers: { 'content-type': 'application/json' } })
  await expect(adminFinanceApi.export({})).rejects.toThrow('admin.invalidResponse')
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [refund], total: 13 } })
  expect(await adminFinanceApi.refunds({ status: 1, page: 2, take: 12 })).toMatchObject({ list: [refund], totalPages: 2 })
  expect(authorizedAxios.post).toHaveBeenLastCalledWith('/payment/refund-requests/filter', { status: 1, page: 2, take: 12 }, { signal: undefined })
})
