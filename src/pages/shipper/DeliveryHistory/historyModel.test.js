import { expect, it } from 'vitest'
import { readHistoryQuery, historyFilter, historyParams } from './historyModel'
it('maps calendar dates to inclusive Vietnam completion timestamps', () => {
  const query = readHistoryQuery(new URLSearchParams('from=2026-11-01&to=2026-11-02&taskType=2&page=3'))
  expect(historyFilter(query)).toEqual({ fromDate: Date.parse('2026-11-01T00:00:00+07:00') / 1000, toDate: Date.parse('2026-11-02T23:59:59+07:00') / 1000, taskType: 2, page: 3, take: 12 })
})
it('rejects invalid URL dates, unsupported types and unsafe pages', () => {
  expect(readHistoryQuery(new URLSearchParams('from=2026-02-30&to=2026-01-01&taskType=3&page=-1'))).toEqual({ from: '', to: '', taskType: '', page: 1, invalidDates: true })
  expect(readHistoryQuery(new URLSearchParams('page=100000000000000')).page).toBe(1)
})
it('preserves one-sided ranges and omits UI metadata from URL', () => {
  const query = readHistoryQuery(new URLSearchParams('to=2026-11-09'))
  expect(historyParams(query)).toEqual({ to: '2026-11-09' })
  expect(historyFilter(query).fromDate).toBeUndefined()
})
