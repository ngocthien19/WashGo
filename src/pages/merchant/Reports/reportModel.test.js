import { describe, expect, it } from 'vitest'
import { readReportQuery, vietnamToday, previousRange, reportBuckets, validReportRange, percentChange, reportCsv } from './reportModel'
import { dateRangeFilter } from '~/utils/dateRange'

describe('report date and comparison scope', () => {
  it('uses Vietnam dates and Monday/month starts through the selected day', () => {
    expect(vietnamToday(new Date('2026-11-06T17:01:00Z'))).toBe('2026-11-07')
    expect(readReportQuery(new URLSearchParams('period=week'), '2026-11-07')).toEqual({ mode: 'week', from: '2026-11-02', to: '2026-11-07' })
    expect(readReportQuery(new URLSearchParams(), '2026-11-07')).toEqual({ mode: 'month', from: '2026-11-01', to: '2026-11-07' })
    expect(previousRange({ from: '2024-03-01', to: '2024-03-03' })).toEqual({ from: '2024-02-27', to: '2024-02-29' })
  })
  it('rejects future, empty, inverted and over-limit custom ranges', () => {
    for (const [from, to] of [['', '2026-11-07'], ['2026-11-07', '2026-11-08'], ['2026-11-07', '2026-11-06'], ['2025-01-01', '2026-11-07'], ['2026-02-30', '2026-11-07']]) {
      expect(validReportRange(from, to, '2026-11-07')).toBe(false)
    }
    expect(readReportQuery(new URLSearchParams('period=custom&from=bad&to=2026-11-07'), '2026-11-07').mode).toBe('month')
  })
  it('creates bounded contiguous non-overlapping buckets covering both equal-length periods', () => {
    for (const range of [{ from: '2026-11-07', to: '2026-11-07' }, { from: '2026-10-01', to: '2026-10-31' }, { from: '2025-11-07', to: '2026-11-07' }]) {
      const buckets = reportBuckets(range)
      expect(buckets.length).toBeLessThanOrEqual(12)
      for (const key of ['current', 'previous']) {
        const bounds = dateRangeFilter(key === 'current' ? range : previousRange(range))
        expect(buckets[0][key].fromDate).toBe(bounds.fromDate)
        expect(buckets.at(-1)[key].toDate).toBe(bounds.toDate)
        buckets.slice(1).forEach((bucket, index) => expect(bucket[key].fromDate).toBe(buckets[index][key].toDate + 1))
      }
    }
  })
})

it('does not invent growth percentages for a zero baseline', () => {
  expect(percentChange(5, 0)).toBeNull()
  expect(percentChange(0, 0)).toBe(0)
  expect(percentChange(80, 100)).toBe(-20)
  expect(percentChange(120, 100)).toBe(20)
})

it('exports UTF-8 CSV with defined scope, unavailable metrics and formula-safe values', () => {
  const data = { range: { from: '2026-11-07', to: '2026-11-07' }, previousRange: { from: '2026-11-06', to: '2026-11-06' }, current: { total: 2, completed: 1 }, previous: { total: 1, completed: 0 }, buckets: [{ label: '=DANGER,"quoted"', current: 2, previous: 1 }] }
  const csv = reportCsv(data, (key) => key)
  expect(csv.startsWith('\uFEFF')).toBe(true)
  expect(csv).toContain('"merchant.reports.revenue","merchant.reports.unavailable"')
  expect(csv).toContain('"\'=DANGER,""quoted"""')
  expect(csv).toContain('merchant.reports.noBase')
})
