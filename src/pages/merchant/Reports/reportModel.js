import { validDay, dateRangeFilter } from '~/utils/dateRange'

export const REPORT_LIMITS = { MAX_DAYS: 366, MAX_BUCKETS: 12, CONCURRENCY: 4 }
const DAY = 86400000
const stamp = (day) => Date.parse(`${day}T00:00:00Z`)
export const shiftDay = (day, amount) => new Date(stamp(day) + amount * DAY).toISOString().slice(0, 10)
export const vietnamToday = (now = new Date()) => new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10)
export const rangeDays = ({ from, to }) => Math.round((stamp(to) - stamp(from)) / DAY) + 1
export const validReportRange = (from, to, today = vietnamToday()) => validDay(from) && validDay(to) && from <= to && to <= today && rangeDays({ from, to }) <= REPORT_LIMITS.MAX_DAYS && validDay(shiftDay(from, -rangeDays({ from, to })))

export function readReportQuery(params, today = vietnamToday()) {
  const mode = ['day', 'week', 'month', 'custom'].includes(params.get('period')) ? params.get('period') : 'month'
  const end = validDay(params.get('to') || '') && params.get('to') <= today ? params.get('to') : today
  if (mode === 'custom' && validReportRange(params.get('from') || '', params.get('to') || '', today)) {
    return { mode, from: params.get('from'), to: end }
  }
  const period = mode === 'custom' ? 'month' : mode
  const weekday = (new Date(`${end}T00:00:00Z`).getUTCDay() + 6) % 7
  return { mode: period, from: period === 'day' ? end : period === 'week' ? shiftDay(end, -weekday) : `${end.slice(0, 7)}-01`, to: end }
}

export const previousRange = (range) => ({ from: shiftDay(range.from, -rangeDays(range)), to: shiftDay(range.from, -1) })

export function reportBuckets(range) {
  const days = rangeDays(range)
  const current = dateRangeFilter(range)
  const previous = dateRangeFilter(previousRange(range))
  if (days === 1) {
    return Array.from({ length: 12 }, (_, index) => ({ key: String(index), label: `${String(index * 2).padStart(2, '0')}:00`,
      current: { fromDate: current.fromDate + index * 7200, toDate: current.fromDate + (index + 1) * 7200 - 1 },
      previous: { fromDate: previous.fromDate + index * 7200, toDate: previous.fromDate + (index + 1) * 7200 - 1 } }))
  }
  const step = Math.ceil(days / REPORT_LIMITS.MAX_BUCKETS)
  return Array.from({ length: Math.ceil(days / step) }, (_, index) => {
    const offset = index * step
    const count = Math.min(step, days - offset)
    const from = shiftDay(range.from, offset), to = shiftDay(from, count - 1)
    return { key: String(index), label: from === to ? from.slice(5) : `${from.slice(5)} – ${to.slice(5)}`, current: dateRangeFilter({ from, to }), previous: dateRangeFilter({ from: shiftDay(previousRange(range).from, offset), to: shiftDay(previousRange(range).from, offset + count - 1) }) }
  })
}

export function percentChange(current, previous) {
  if (previous === 0) {
    return current === 0 ? 0 : null
  }
  return (current - previous) / previous * 100
}

export const csvCell = (value) => `"${String(value ?? '').replace(/^[\s]*[=+@-]/, (text) => `'${text}`).replaceAll('"', '""')}"`
export function reportCsv(report, translate) {
  const t = (key) => translate(`merchant.reports.${key}`)
  const rows = [
    [t('title')], [t('scope')], [t('current'), report.range.from, report.range.to], [t('previous'), report.previousRange.from, report.previousRange.to],
    [t('metric'), t('current'), t('previous'), t('changePercent')],
    ...['total', 'completed'].map((key) => [t(key), report.current[key], report.previous[key], percentChange(report.current[key], report.previous[key]) ?? t('noBase')]),
    [t('revenue'), t('unavailable')], [t('onTime'), t('unavailable')], [t('bestServices'), t('unavailable')],
    [], [t('buckets'), t('current'), t('previous')], ...report.buckets.map((bucket) => [bucket.label, bucket.current, bucket.previous])
  ]
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadReport(report, translate) {
  const url = URL.createObjectURL(new Blob([reportCsv(report, translate)], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `washgo-report-${report.range.from}-${report.range.to}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  // Allow the browser to start reading the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
