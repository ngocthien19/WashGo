import * as yup from 'yup'

export const emptySchedule = () => ({ timeZone: 'Asia/Ho_Chi_Minh', alwaysOpen: false, weekly: [], closedDates: [] })
export const readSchedule = value => {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return emptySchedule()
    }
  }
  return value && typeof value === 'object' ? { ...emptySchedule(), ...value } : emptySchedule()
}
export const dailyShift = value => {
  const { weekly } = readSchedule(value)
  if (!weekly.length) {
    return { open: '', close: '' }
  }
  const first = weekly[0]?.shifts?.[0]
  return weekly.length === 7 && new Set(weekly.map(day => day.dayOfWeek)).size === 7 && weekly.every(day => day.shifts?.length === 1 && day.shifts[0].open === first?.open && day.shifts[0].close === first?.close)
    ? { ...first } : null
}
export const dailyWeek = shift => Array.from({ length: 7 }, (_, index) => ({ dayOfWeek: index + 1, shifts: [{ ...shift }] }))
const minute = (value, closing = false) => {
  if (closing && value === '24:00') {
    return 1440
  }
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN
}
export function validSchedule(value) {
  if (!value || value.timeZone !== 'Asia/Ho_Chi_Minh' || typeof value.alwaysOpen !== 'boolean' || !Array.isArray(value.weekly) || !Array.isArray(value.closedDates)) {
    return false
  }
  if (value.closedDates.length > 60 || value.closedDates.some(date => !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
    return false
  }
  if (value.alwaysOpen) {
    return value.weekly.length === 0
  }
  if (!value.weekly.length || new Set(value.weekly.map(day => day.dayOfWeek)).size !== value.weekly.length) {
    return false
  }
  return value.weekly.every(day => {
    if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 1 || day.dayOfWeek > 7 || !Array.isArray(day.shifts) || !day.shifts.length || day.shifts.length > 4) {
      return false
    }
    const shifts = day.shifts.map(shift => [minute(shift.open), minute(shift.close, true)]).sort((a, b) => a[0] - b[0])
    return shifts.every(([start, end], index) => Number.isFinite(start) && Number.isFinite(end) && start < end && (!index || start >= shifts[index - 1][1]))
  })
}
export const scheduleSchema = yup.mixed().required('schedule.invalid').test('schedule', 'schedule.invalid', validSchedule)
