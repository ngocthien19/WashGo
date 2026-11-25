import { expect, it } from 'vitest'
import { dailyShift, dailyWeek, emptySchedule, readSchedule, validSchedule } from './scheduleModel'

const schedule = shifts => ({ ...emptySchedule(), weekly: [{ dayOfWeek: 1, shifts }] })
it('expands daily hours into independent shifts on all seven days', () => {
  const shift = { open: '08:00', close: '20:00' }
  const weekly = dailyWeek(shift)
  expect(weekly.map(day => day.dayOfWeek)).toEqual([1, 2, 3, 4, 5, 6, 7])
  expect(dailyShift({ ...emptySchedule(), weekly })).toEqual(shift)
  expect(validSchedule({ ...emptySchedule(), weekly })).toBe(true)
  weekly[0].shifts[0].open = '09:00'
  expect(weekly[1].shifts[0].open).toBe('08:00')
  expect(dailyShift({ ...emptySchedule(), weekly })).toBeNull()
  expect(dailyShift(schedule([shift]))).toBeNull()
})
it('requires an explicit schedule without inventing hours from legacy text', () => {
  expect(validSchedule(readSchedule('08:00-20:00'))).toBe(false)
  expect(validSchedule({ ...emptySchedule(), alwaysOpen: true })).toBe(true)
  expect(validSchedule(emptySchedule())).toBe(false)
})
it('accepts split shifts and midnight closing, rejects overlap and overnight shifts', () => {
  expect(validSchedule(schedule([{ open: '08:00', close: '12:00' }, { open: '13:00', close: '24:00' }]))).toBe(true)
  for (const shifts of [[{ open: '08:00', close: '13:00' }, { open: '12:00', close: '20:00' }], [{ open: '20:00', close: '08:00' }], [{ open: '08:60', close: '20:00' }]]) {
    expect(validSchedule(schedule(shifts))).toBe(false)
  }
})
it('validates holidays, timezone, weekday uniqueness and day/shift limits', () => {
  const value = schedule([{ open: '08:00', close: '20:00' }])
  expect(validSchedule({ ...value, closedDates: ['2026-12-25'] })).toBe(true)
  for (const patch of [{ closedDates: ['2026-02-30'] }, { timeZone: 'UTC' }, { weekly: [...value.weekly, ...value.weekly] }, { weekly: [{ dayOfWeek: 8, shifts: value.weekly[0].shifts }] }, { alwaysOpen: true }]) {
    expect(validSchedule({ ...value, ...patch })).toBe(false)
  }
})
