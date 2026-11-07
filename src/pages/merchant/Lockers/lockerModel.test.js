import { expect, it } from 'vitest'
import { readLockerQuery, lockerFilter } from './lockerModel'
import { dateRangeFilter, validRange } from '~/utils/dateRange'
it('validates URL filters and sends only supported locker sorting', () => {
  const query = readLockerQuery(new URLSearchParams('keyword= LK &status=2&page=3&sort=nameDesc'))
  expect(lockerFilter(query)).toMatchObject({ keyword: 'LK', status: 2, page: 3, take: 12, sortBy: [{ field: 'Name', isDescending: true }] })
  expect(readLockerQuery(new URLSearchParams('status=7&page=NaN&sort=constructor'))).toMatchObject({ status: '', page: 1, sort: 'code' })
})
it('uses inclusive Vietnam day bounds for usage and rejects inverted ranges', () => {
  expect(dateRangeFilter({ from: '2026-11-07', to: '2026-11-07' })).toEqual({ fromDate: 1793984400, toDate: 1794070799 })
  expect(validRange('2026-11-08', '2026-11-07')).toBe(false)
  expect(validRange('2026-02-30', '')).toBe(false)
})
