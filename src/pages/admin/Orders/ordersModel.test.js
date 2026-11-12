import { expect, it } from 'vitest'
import { readAdminOrdersQuery, writeAdminOrdersQuery, listFilter, waitingFilter, scopeFilter, canAssignMerchant, canStore } from './ordersModel'

it('keeps all-order and waiting filters separate with Vietnam day boundaries', () => {
  const query = readAdminOrdersQuery(new URLSearchParams('tab=waiting&keyword=WG&status=4&from=2026-11-08&to=2026-11-08&overdue=true'))
  expect(waitingFilter(query)).toEqual({ page: 1, take: 12, overdueOnly: true, fromDate: 1794070800, toDate: 1794157199 })
  expect(listFilter(query)).toMatchObject({ keyword: 'WG', status: 4, take: 12 })
  expect(scopeFilter(query)).not.toHaveProperty('status')
  expect(writeAdminOrdersQuery(query).get('tab')).toBe('waiting')
})
it('rejects invalid dates, identifiers and pages from the URL', () => {
  expect(readAdminOrdersQuery(new URLSearchParams('from=2026-11-09&to=2026-11-08&page=-1&merchantId=invalid'))).toMatchObject({ from: '', to: '', page: 1, merchantId: '' })
})
it('offers Merchant assignment only for unassigned deposited orders', () => {
  expect(canAssignMerchant({ status: 2, merchantId: null })).toBe(true)
  expect(canAssignMerchant({ status: 1 })).toBe(false)
  expect(canAssignMerchant({ status: 2, merchantId: 'merchant' })).toBe(false)
})
it('uses server capability for storage, including changes to policy timing', () => {
  expect(canStore({ allowedActions: { canMoveToStorage: true } })).toBe(true)
  expect(canStore({ allowedActions: { canMoveToStorage: false }, status: 10, serverNow: '2099-01-01' })).toBe(false)
  expect(canStore({ status: 10 })).toBe(false)
})
