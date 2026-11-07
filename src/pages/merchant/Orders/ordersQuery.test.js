import { expect, it } from 'vitest'
import { readMerchantOrdersQuery, writeMerchantOrdersQuery, buildMerchantOrdersFilter, orderScopeFilter, validDay, validRange } from './ordersQuery'

it('uses inclusive Vietnam calendar-day boundaries independently of the browser timezone', () => {
  const query = readMerchantOrdersQuery(new URLSearchParams('from=2026-11-07&to=2026-11-08&status=4&page=2'))
  const filter = buildMerchantOrdersFilter(query)
  expect(filter.fromDate).toBe(Date.UTC(2026, 10, 6, 17, 0, 0) / 1000)
  expect(filter.toDate).toBe(Date.UTC(2026, 10, 8, 16, 59, 59) / 1000)
  expect(filter.status).toBe(4)
  expect(filter.page).toBe(2)
  expect(readMerchantOrdersQuery(writeMerchantOrdersQuery(query))).toEqual(query)
  expect(orderScopeFilter(query)).not.toHaveProperty('status')
  expect(orderScopeFilter(query)).not.toHaveProperty('page')
})
it('rejects impossible dates and inverted ranges without sending malformed filters', () => {
  expect(validDay('2026-02-29')).toBe(false)
  expect(validDay('2024-02-29')).toBe(true)
  expect(validDay('2026-02-31')).toBe(false)
  expect(validRange('2026-11-08', '2026-11-07')).toBe(false)
  const query = readMerchantOrdersQuery(new URLSearchParams('from=2026-11-08&to=2026-11-07'))
  expect(orderScopeFilter(query).fromDate).toBeUndefined()
  expect(validRange('2026-11-07', '')).toBe(true)
  expect(validRange('', '2026-11-07')).toBe(true)
})
