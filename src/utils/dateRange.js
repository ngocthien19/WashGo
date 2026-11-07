export const validDay = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && Date.parse(`${value}T00:00:00+07:00`) > 0
}
export const validRange = (from, to) => (!from || validDay(from)) && (!to || validDay(to)) && (!from || !to || from <= to)
export const dateRangeFilter = ({ from, to }) => ({
  fromDate: from ? Math.floor(Date.parse(`${from}T00:00:00+07:00`) / 1000) : undefined,
  toDate: to ? Math.floor(Date.parse(`${to}T23:59:59+07:00`) / 1000) : undefined
})
