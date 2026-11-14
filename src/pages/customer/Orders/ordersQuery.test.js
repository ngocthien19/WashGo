import { describe, expect, it } from 'vitest'
import { buildOrdersFilter, initialOrdersQuery, readOrdersQuery, writeOrdersQuery } from './ordersQuery'
import { formatDateTime } from '~/utils/format/formats'

describe('customer orders query', () => {
  it('shares search, lifecycle, payment status, sort and pagination without trusting customer identity', () => {
    const query = { keyword: 'WG2611', status: '8', paymentStatus: '1', sort: 'oldest', page: 3 }
    expect(readOrdersQuery(writeOrdersQuery(query))).toEqual(query)
    expect(buildOrdersFilter(query)).toEqual({ keyword: 'WG2611', status: 8, paymentStatus: 1, sortBy: [{ field: 'CreatedOn', isDescending: false }], page: 3, take: 6 })
    expect(buildOrdersFilter(query)).not.toHaveProperty('customerId')
  })
  it('discards invalid enum values, unsafe pages and unsupported sorts', () => {
    expect(readOrdersQuery(new URLSearchParams('status=50&paymentStatus=0&page=1.5&sort=FinalAmount'))).toEqual(initialOrdersQuery)
    expect(writeOrdersQuery(initialOrdersQuery).toString()).toBe('')
  })
  it('formats backend Unix seconds consistently with ISO timestamps and handles missing dates', () => {
    expect(formatDateTime(1793923200)).toBe(formatDateTime(new Date(1793923200000).toISOString()))
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('not-a-date')).toBe('—')
  })
})
