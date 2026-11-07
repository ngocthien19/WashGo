import { describe, expect, it } from 'vitest'
import { readReportQuery, vietnamToday, validReportRange, reportParams } from './reportModel'

describe('report date and comparison scope', () => {
  it('uses Vietnam dates and Monday/month starts through the selected day', () => {
    expect(vietnamToday(new Date('2026-11-06T17:01:00Z'))).toBe('2026-11-07')
    expect(readReportQuery(new URLSearchParams('period=week'), '2026-11-07')).toEqual({ mode: 'week', from: '2026-11-02', to: '2026-11-07' })
    expect(readReportQuery(new URLSearchParams(), '2026-11-07')).toEqual({ mode: 'month', from: '2026-11-01', to: '2026-11-07' })

  })
  it('rejects future, empty, inverted and over-limit custom ranges', () => {
    for (const [from, to] of [['', '2026-11-07'], ['2026-11-07', '2026-11-08'], ['2026-11-07', '2026-11-06'], ['2025-01-01', '2026-11-07'], ['2026-02-30', '2026-11-07']]) {
      expect(validReportRange(from, to, '2026-11-07')).toBe(false)
    }
    expect(readReportQuery(new URLSearchParams('period=custom&from=bad&to=2026-11-07'), '2026-11-07').mode).toBe('month')
  })
  it('passes presets to BE and custom dates explicitly, never a client-supplied merchant identity', () => {
    expect(reportParams({ mode: 'day', from: '2026-11-07', to: '2026-11-07', merchantId: 'bad' })).toEqual({ period: 'today', top: 5 })
    expect(reportParams({ mode: 'week' })).toEqual({ period: 'week', top: 5 })
    expect(reportParams({ mode: 'custom', from: '2026-11-01', to: '2026-11-07' })).toEqual({ period: 'custom', from: '2026-11-01', to: '2026-11-07', top: 5 })
  })
})
