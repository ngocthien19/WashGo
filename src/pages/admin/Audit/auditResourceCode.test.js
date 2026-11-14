import { expect, it } from 'vitest'
import { auditResourceCode } from './auditResourceCode'

it('uses the known order code only for the exact scoped review with a scrubbed code', () => {
  const row = { resourceId: 'review-1', resourceType: 'OrderRating', resourceCode: 'WG[number]', reason: 'Phone [number]' }
  const context = { resourceId: 'review-1', resourceType: 'OrderRating', resourceCode: 'WG2611141234' }
  expect(auditResourceCode(row, context)).toBe('WG2611141234')
  expect(auditResourceCode({ ...row, resourceId: 'review-2' }, context)).toBe('WG[number]')
  expect(auditResourceCode({ ...row, resourceType: 'WashOrder' }, context)).toBe('WG[number]')
  expect(auditResourceCode(row)).toBe('WG[number]')
  expect(auditResourceCode({ ...row, resourceCode: 'WG-ORIGINAL' }, context)).toBe('WG-ORIGINAL')
  expect(row.reason).toBe('Phone [number]')
})
