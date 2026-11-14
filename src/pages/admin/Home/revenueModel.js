import { shiftDay } from '~/utils/format/dateRange'

export function revenuePoints(data, { from, to }) {
  const values = new Map(data.map((row) => [row.date, row.revenue]))
  const result = []
  for (let date = from; date <= to && result.length < 366; date = shiftDay(date, 1)) {
    result.push({ date, revenue: values.get(date) ?? 0 })
  }
  return result
}
