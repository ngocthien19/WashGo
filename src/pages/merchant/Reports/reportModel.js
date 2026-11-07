import { validDay, vietnamToday, shiftDay } from '~/utils/dateRange'
export { vietnamToday, shiftDay } from '~/utils/dateRange'

export const REPORT_LIMITS = { MAX_DAYS: 366 }
const DAY = 86400000
const stamp = (day) => Date.parse(`${day}T00:00:00Z`)
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

export const reportParams = (range) => ({ period: range.mode === 'custom' ? 'custom' : range.mode === 'day' ? 'today' : range.mode || 'custom', ...(range.mode === 'custom' || !range.mode ? { from: range.from, to: range.to } : {}), top: 5 })

export function downloadReport(blob, report) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `washgo-report-${report.current.fromLocalDate}-${report.current.toLocalDate}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
