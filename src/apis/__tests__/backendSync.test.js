import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { adminWorkspaceApi } from '../admin/adminWorkspaceApi'
import { adminFinanceApi } from '../admin/adminFinanceApi'
import { adminReviewApi } from '../admin/adminReviewApi'
import { adminServiceApi } from '../admin/adminServiceApi'
import { adminLockerApi } from '../admin/adminLockerApi'
import { customerRatingApi } from '../customer/customerRatingApi'
import { merchantReviewApi } from '../merchant/merchantReviewApi'
import { merchantProfileApi } from '../merchant/merchantProfileApi'
import { reconcileSchema } from '~/pages/admin/Finance/financeModel'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }))
const id = '11111111-1111-4111-8111-111111111111'
const ok = data => ({ data: { succeeded: true, data } })
beforeEach(() => vi.clearAllMocks())

it('keeps the current logical session even when it is outside the requested page', async () => {
  const current = { id, startedAt: '2026-11-12T01:00:00Z', lastActiveAt: '2026-11-12T01:00:00Z', expiresAt: '2026-12-12T01:00:00Z', isCurrent: true }
  authorizedAxios.get.mockResolvedValue(ok({ total: 21, page: 2, take: 10, hasMore: true, current, items: [] }))
  expect(await adminWorkspaceApi.sessions(undefined, { page: 2, take: 10 })).toMatchObject({ current: { id }, total: 21, hasMore: true })
  expect(authorizedAxios.get).toHaveBeenCalledWith('/auth/sessions', { params: { page: 2, take: 10 }, signal: undefined })
})
it('loads pending proposals from the same service summary instead of a second filtered list', async () => {
  authorizedAxios.get.mockResolvedValue(ok({ total: 3, counts: { 'Approved:Active': 2 }, pendingProposals: 4 }))
  expect(await adminServiceApi.summary()).toEqual([3, 2, 1, 4])
  expect(authorizedAxios.post).not.toHaveBeenCalled()
})
it('sends the displayed box status in addition to its locker version', async () => {
  authorizedAxios.put.mockResolvedValue(ok(true))
  await adminLockerApi.boxStatus({ lockerId: id, boxId: id, expectedVersion: 'opaque', expectedBoxStatus: 4, newStatus: 1 })
  expect(authorizedAxios.put.mock.calls[0][1]).toMatchObject({ expectedBoxStatus: 4, newStatus: 1, expectedVersion: 'opaque' })
})
it('normalizes rating summary visibleAverage and scopes single operation lookup to Visibility', async () => {
  authorizedAxios.post.mockResolvedValue(ok({ total: 3, visible: 2, hidden: 1, visibleCount: 2, visibleAverage: 4.5, histogram: { 4: 1, 5: 2 } }))
  expect(await adminReviewApi.summary({})).toMatchObject({ averageStars: 4.5, visibleCount: 2 })
  const row = { id, orderId: id, orderCode: 'WG', overallStars: 5, isHidden: true, createdOn: 100 }
  authorizedAxios.get.mockResolvedValue(ok({ operationId: id, state: 'Completed', action: 'Visibility', resourceId: id, result: { succeeded: true, data: row } }))
  expect(await adminReviewApi.lookup({ operationId: id, action: 'Hide', items: [{ id }] }, false)).toMatchObject({ id, isHidden: true })
})
it('uses paged commissions and preserves global totals instead of summing the page', async () => {
  authorizedAxios.post.mockResolvedValue(ok({ page: 2, take: 12, total: 20, items: [], grossRevenue: 1000, refundedAmount: 100, netRevenue: 900, commissionAmount: 0, payoutAmount: 900, commissionComplete: true }))
  expect(await adminFinanceApi.commissions({ page: 2, take: 12 })).toMatchObject({ total: 20, totalPages: 2, commissionAmount: 0, list: [] })
  expect(authorizedAxios.post.mock.calls[0][0]).toBe('/finance/commissions/paged')
})
it('does not discard the legacy/snapshot metadata from settlement line pages', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, list: [], total: 0, isSnapshot: false, basis: 'Legacy recalculation', generatedAt: '2026-11-12T01:00:00Z' } })
  expect(await adminFinanceApi.lines(id, 1)).toMatchObject({ isSnapshot: false, basis: 'Legacy recalculation' })
})
it('partner feedback suppresses unreleased content and excludes cross-role identity even if a response is over-enriched', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, total: 1, list: [{ id, overallStars: 4, contentReleased: false, comment: 'private', imageUrls: ['private'], customerName: 'PRIVATE', orderId: id, orderCode: 'PRIVATE' }] } })
  const response = await merchantReviewApi.list({ page: 1, take: 5, merchantId: 'other' })
  expect(response.list[0]).not.toHaveProperty('customerName')
  expect(response.list[0]).not.toHaveProperty('orderId')
  expect(response.list[0]).toMatchObject({ comment: null, imageUrls: [] })
  expect(authorizedAxios.post.mock.calls[0]).toEqual(['/rating/partner/filter', { page: 1, take: 5 }, { signal: undefined }])
})
it('customer feedback excludes partner and moderation fields, preserves isVisible and passes operationId', async () => {
  authorizedAxios.post.mockResolvedValue(ok({ id, orderId: id, overallStars: 5, isVisible: false, merchantId: id, merchantName: 'PRIVATE', hiddenReason: 'INTERNAL' }))
  const rating = await customerRatingApi.create({ orderId: id, overallStars: 5, operationId: id })
  expect(rating).toMatchObject({ isVisible: false })
  expect(rating).not.toHaveProperty('merchantName')
  expect(rating).not.toHaveProperty('hiddenReason')
  expect(authorizedAxios.post.mock.calls[0][1].operationId).toBe(id)
})
it('requires a Merchant profile version and forwards it unchanged', async () => {
  await expect(merchantProfileApi.requestUpdate({})).rejects.toThrow()
  expect(authorizedAxios.post).not.toHaveBeenCalled()
  authorizedAxios.post.mockResolvedValue(ok({ id, status: 1 }))
  await merchantProfileApi.requestUpdate({ expectedMerchantVersion: 'opaque', operationId: id, role: 'Admin' })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ expectedMerchantVersion: 'opaque', operationId: id })
})
it('reconciliation accepts a verified zero percent and requires evidence and confirmation', async () => {
  await expect(reconcileSchema.validate({ rate: 0, evidence: 'Verified signed contract', confirmed: true })).resolves.toMatchObject({ rate: 0 })
  await expect(reconcileSchema.validate({ rate: 20, evidence: 'short', confirmed: true })).rejects.toThrow()
  await expect(reconcileSchema.validate({ rate: 20.123, evidence: 'Verified signed contract', confirmed: true })).rejects.toThrow()
  await expect(reconcileSchema.validate({ rate: 20, evidence: 'Verified signed contract', confirmed: false })).rejects.toThrow()
})
