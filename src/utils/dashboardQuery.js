import { dateRangeFilter, validDay, vietnamToday, shiftDay } from '~/utils/dateRange'

export const validDashboardRange = (from, to) => validDay(from) && validDay(to) && from <= to && to <= vietnamToday() && (Date.parse(to) - Date.parse(from)) / 86400000 < 366
export const dashboardRange = (params) => {
  const today = vietnamToday()
  const mode = ['day', 'week', 'month', 'custom'].includes(params.get('period')) ? params.get('period') : 'month'
  if (mode === 'custom' && validDashboardRange(params.get('from'), params.get('to'))) {
    return { mode, from: params.get('from'), to: params.get('to') }
  }
  const period = mode === 'custom' ? 'month' : mode
  return { mode: period, from: period === 'day' ? today : period === 'week' ? shiftDay(today, -6) : `${today.slice(0, 7)}-01`, to: today }
}
export const dashboardFilter = (range) => ({ period: 'custom', ...dateRangeFilter(range) })
