import { beforeEach, expect, it, vi } from 'vitest'
import { resolveAuditCodes } from './auditResourceCodes'
import { adminReviewApi } from './adminReviewApi'
vi.mock('./adminReviewApi', () => ({ adminReviewApi: { detail: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const id = '11111111-1111-4111-8111-111111111111'
const row = { resourceType: 'OrderRating', resourceId: id, resourceCode: 'WG[number]', reason: 'Phone [number]' }
it('deduplicates review lookup per response and preserves original audit values', async () => {
  adminReviewApi.detail.mockResolvedValue({ id, orderCode: 'WG2611141234' })
  const signal = new AbortController().signal
  const rows = await resolveAuditCodes([row, { ...row, action: 'Show' }, { ...row, resourceType: 'User' }], signal)
  expect(adminReviewApi.detail).toHaveBeenCalledExactlyOnceWith(id, signal)
  expect(rows[0]).toMatchObject({ displayResourceCode: 'WG2611141234', resourceCode: 'WG[number]', reason: 'Phone [number]' })
  expect(rows[1].displayResourceCode).toBe('WG2611141234')
  expect(rows[2]).not.toHaveProperty('displayResourceCode')
  expect(row).not.toHaveProperty('displayResourceCode')
})
it('keeps the audit available if an old review is unavailable and skips unmasked codes', async () => {
  adminReviewApi.detail.mockRejectedValue(new Error('unavailable'))
  expect(await resolveAuditCodes([row])).toEqual([row])
  adminReviewApi.detail.mockClear()
  const valid = { ...row, resourceCode: 'WG2611141234' }
  expect(await resolveAuditCodes([valid, { ...row, resourceId: 'invalid' }])).toEqual([valid, { ...row, resourceId: 'invalid' }])
  expect(adminReviewApi.detail).not.toHaveBeenCalled()
})
