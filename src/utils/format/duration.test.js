import { expect, it } from 'vitest'
import i18n from '~/i18n'
import { formatDurationMinutes } from './formats'

it('formats waiting minutes as days, hours and minutes in Vietnamese', async () => {
  await i18n.changeLanguage('vi')
  expect(formatDurationMinutes(1051)).toBe('17 giờ 31 phút')
  expect(formatDurationMinutes(1501)).toBe('1 ngày 1 giờ 1 phút')
  expect(formatDurationMinutes(1440)).toBe('1 ngày')
  expect(formatDurationMinutes(60)).toBe('1 giờ')
  expect(formatDurationMinutes(0)).toBe('0 phút')
  expect(formatDurationMinutes(-1)).toBe('—')
  expect(formatDurationMinutes(null)).toBe('—')
})
it('uses singular and plural units correctly in English', async () => {
  await i18n.changeLanguage('en')
  expect(formatDurationMinutes(1051)).toBe('17 hours 31 minutes')
  expect(formatDurationMinutes(1501)).toBe('1 day 1 hour 1 minute')
})
