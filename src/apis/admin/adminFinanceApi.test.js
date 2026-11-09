import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { adminFinanceApi } from './adminFinanceApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
const id = 'a0000000-0000-4000-8000-000000000001', merchantId = 'b0000000-0000-4000-8000-000000000001'
const row = { id, merchantId, merchantName: 'Store', periodFrom: '2026-10-01T00:00:00Z', periodTo: '2026-10-31T00:00:00Z', grossRevenue: 100000, refundedAmount: 0, netRevenue: 100000, commissionRate: 20, commissionAmount: 20000, payoutAmount: 80000, status: 1, orderCount: 1 }
const refund = { id, orderId: id, customerId: id, amount: 30000, status: 1, reason: 'Cancelled' }
beforeEach(() => vi.clearAllMocks())
it('settlement filters do not pretend to support dates or keyword', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [row], total: 13 } })
  expect(await adminFinanceApi.settlements({ page: 2, take: 12, merchantId, status: 1, fromDate: 123, keyword: 'fake' })).toMatchObject({ totalPages: 2 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ page: 2, take: 12, merchantId, status: 1 })
})
it('reads a fresh settlement by paging its Merchant list instead of inventing a GET endpoint', async () => {
  authorizedAxios.post.mockImplementation((path, query) => Promise.resolve({ data: { succeeded: true, list: query.page === 2 ? [row] : [], total: 101 } }))
  expect(await adminFinanceApi.settlement(row)).toEqual(row)
  expect(authorizedAxios.post.mock.calls[1][1]).toEqual({ merchantId, page: 2, take: 100 })
  expect(authorizedAxios.get).not.toHaveBeenCalled()
})
it('creates only with period and Merchant, validates the frozen response boundaries', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: row } })
  const body = { merchantId, fromDate: Date.parse(row.periodFrom) / 1000, toDate: Date.parse(row.periodTo) / 1000, payoutAmount: 1, status: 2, actorId: id }
  await adminFinanceApi.create(body)
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ merchantId, fromDate: body.fromDate, toDate: body.toDate })
  await expect(adminFinanceApi.create({ ...body, toDate: body.toDate + 1 })).rejects.toMatchObject({ uncertain: true })
})
it('verifies payout/refund acknowledgements and refuses another reference on replay', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { ...row, status: 2, paymentReference: 'OTHER' } } })
  await expect(adminFinanceApi.pay(id, 'BANK123')).rejects.toMatchObject({ uncertain: true })
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { ...refund, status: 2 } } })
  await adminFinanceApi.review(id, true, 'Verified')
  expect(authorizedAxios.post).toHaveBeenLastCalledWith(`/payment/refund-requests/${id}/review`, { approve: true, reviewNote: 'Verified' })
  await expect(adminFinanceApi.confirmRefund(id, 'BANK123')).rejects.toMatchObject({ uncertain: true })
})
it('validates real CSV blobs and unpaged refund response contracts', async () => {
  authorizedAxios.post.mockResolvedValue({ data: new Blob(['{}']), headers: { 'content-type': 'application/json' } })
  await expect(adminFinanceApi.export({})).rejects.toThrow('admin.invalidResponse')
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: [refund] } })
  expect(await adminFinanceApi.refunds('1')).toEqual([refund])
  expect(authorizedAxios.get).toHaveBeenCalledWith('/payment/refund-requests', { params: { status: 1 }, signal: undefined })
})
