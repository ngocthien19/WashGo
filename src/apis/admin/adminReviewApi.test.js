import { beforeEach, describe, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { adminReviewApi } from './adminReviewApi'
import { readReviewQuery, reviewFilter, canModerate, reviewActionSchema } from '~/pages/admin/Reviews/reviewModel'

vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
const id = '10000000-0000-4000-8000-000000000001', orderId = '20000000-0000-4000-8000-000000000001'
const row = { id, orderId, orderCode: 'WG-REVIEW', overallStars: 4, isHidden: false, createdOn: 1794391200, imageUrls: [], videoUrls: [] }
const ok = data => ({ data: { succeeded: true, data } })
beforeEach(() => vi.clearAllMocks())

describe('admin reviews contract', () => {
  it('preserves false visibility and converts Vietnam calendar dates before server paging', () => {
    const query = readReviewQuery(new URLSearchParams('isHidden=false&stars=4&from=2026-11-01&to=2026-11-02&page=3'))
    expect(reviewFilter(query)).toMatchObject({ isHidden: false, stars: 4, page: 3, take: 12, fromDate: Date.parse('2026-11-01T00:00:00+07:00') / 1000, toDate: Date.parse('2026-11-02T23:59:59+07:00') / 1000 })
  })
  it('rejects invalid URL choices and reversed dates', () => {
    expect(readReviewQuery(new URLSearchParams('stars=0&isHidden=0&merchantId=bad&page=-1&from=2026-11-02&to=2026-11-01'))).toMatchObject({ stars: '', isHidden: '', merchantId: '', page: 1, from: '', to: '' })
  })
  it('accepts legacy read-only rows without inventing moderation permission', async () => {
    authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [row], total: 25 } })
    expect(await adminReviewApi.list({ page: 2, take: 12, isHidden: false, actorId: 'unsupported' })).toMatchObject({ totalPages: 3, currentPage: 2 })
    expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('actorId')
    expect(canModerate(row, true)).toBe(false)
    expect(canModerate({ ...row, version: 'opaque', canHide: true }, true)).toBe(true)
    expect(canModerate({ ...row, version: 'opaque', canHide: true, isHidden: true }, true)).toBe(false)
  })
  it('treats a missing summary endpoint as unavailable rather than zero counts', async () => {
    authorizedAxios.post.mockRejectedValue({ response: { status: 404 } })
    expect(await adminReviewApi.summary({ page: 2, take: 12 })).toEqual({ unavailable: true })
    expect(authorizedAxios.post.mock.calls[0][1]).toEqual({})
  })
  it('does not mask malformed statistics or ordinary server failures as unsupported', async () => {
    authorizedAxios.post.mockResolvedValue(ok({ total: 2, visible: 2, hidden: 1, averageStars: 4 }))
    await expect(adminReviewApi.summary({})).rejects.toThrow('admin.invalidResponse')
    authorizedAxios.post.mockRejectedValue({ response: { status: 500 } })
    await expect(adminReviewApi.summary({})).rejects.toEqual({ response: { status: 500 } })
  })
  it('falls back to the list snapshot for display only when detail is unavailable', async () => {
    authorizedAxios.get.mockRejectedValue({ response: { status: 404 } })
    expect(await adminReviewApi.preview(row)).toEqual({ row, fresh: false })
    authorizedAxios.get.mockResolvedValue(ok({ ...row, id: orderId }))
    await expect(adminReviewApi.preview(row)).rejects.toThrow('admin.invalidResponse')
  })
  it('requires a version and keeps hide commands scoped with explicit destination and operation', async () => {
    await expect(adminReviewApi.visibility(row, true, 'reason', 'operation')).rejects.toThrow('admin.sync.missingVersion')
    expect(authorizedAxios.patch).not.toHaveBeenCalled()
    authorizedAxios.patch.mockResolvedValue(ok({ ...row, isHidden: true, version: 'v2' }))
    await adminReviewApi.visibility({ ...row, version: 'v1' }, true, 'reason', 'operation')
    expect(authorizedAxios.patch).toHaveBeenCalledWith(`/rating/${id}/visibility`, { isHidden: true, reason: 'reason', expectedVersion: 'v1', operationId: 'operation' })
  })
  it('does not retry a batch after an ambiguous write and failed lookup', async () => {
    authorizedAxios.post.mockRejectedValue({ response: { status: 500 } })
    authorizedAxios.get.mockRejectedValue({ response: { status: 404 } })
    await expect(adminReviewApi.batch({ operationId: 'operation', action: 'Hide', reason: 'reason', items: [{ id, expectedVersion: 'v1' }] })).rejects.toMatchObject({ uncertain: true })
    expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
    expect(authorizedAxios.get).toHaveBeenCalledWith('/admin-operations/Rating/operation')
  })
  it('validates hide reason and explicit confirmation while restoring needs no reason', async () => {
    await expect(reviewActionSchema(true).validate({ reason: '  ', confirmed: true })).rejects.toThrow()
    await expect(reviewActionSchema(true).validate({ reason: 'a'.repeat(501), confirmed: true })).rejects.toThrow()
    await expect(reviewActionSchema(false).validate({ reason: '', confirmed: false })).rejects.toThrow()
    await expect(reviewActionSchema(false).validate({ reason: '', confirmed: true })).resolves.toBeTruthy()
  })
})
