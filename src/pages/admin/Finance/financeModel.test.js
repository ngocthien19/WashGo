import { expect, it } from 'vitest'
import { actionAllowed, actionSchema, commissionSnapshot, createSchema, periodFilter, readQuery, settlementFilter, validFinanceRange } from './financeModel'
import { shiftDay, vietnamToday } from '~/utils/format/dateRange'
const merchantId = 'a0000000-0000-4000-8000-000000000001'
it('uses inclusive Vietnam boundaries, only supported settlement filters and safe URL values', () => {
  const query = readQuery(new URLSearchParams(`tab=settlements&merchantId=${merchantId}&from=2026-01-01&to=2026-01-31&status=2&page=3`))
  expect(periodFilter(query)).toEqual({ merchantId, page: 3, take: 12, granularity: 'day', fromDate: Date.parse('2026-01-01T00:00:00+07:00') / 1000, toDate: Date.parse('2026-01-31T23:59:59+07:00') / 1000 })
  expect(settlementFilter(query)).toEqual({ merchantId, status: 2, page: 3, take: 12 })
  expect(readQuery(new URLSearchParams('tab=bad&merchantId=bad&status=99&page=-1'))).toMatchObject({ tab: 'revenue', merchantId: '', status: '', page: 1 })
})
it('limits reporting to 366 inclusive days and settlement creation to completed days', async () => {
  const today = vietnamToday()
  expect(validFinanceRange(shiftDay(today, -365), today)).toBe(true)
  expect(validFinanceRange(shiftDay(today, -366), today)).toBe(false)
  expect(validFinanceRange(today, shiftDay(today, 1))).toBe(false)
  expect(await createSchema.isValid({ merchantId, from: shiftDay(today, -2), to: shiftDay(today, -1) })).toBe(true)
  expect(await createSchema.isValid({ merchantId, from: today, to: today })).toBe(false)
})
it('resolves day, calendar week, month and legacy custom URLs without losing scope', () => {
  const today = vietnamToday()
  expect(readQuery(new URLSearchParams('period=day'))).toMatchObject({ period: 'day', from: today, to: today })
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  expect(readQuery(new URLSearchParams('period=week'))).toMatchObject({ period: 'week', from: shiftDay(today, -weekday), to: today })
  expect(readQuery(new URLSearchParams('period=month&from=2020-01-01&to=2020-02-01')).from).toBe(`${today.slice(0, 7)}-01`)
  expect(readQuery(new URLSearchParams(`from=2026-01-01&to=2026-01-03&merchantId=${merchantId}`))).toMatchObject({ period: 'custom', merchantId, from: '2026-01-01', to: '2026-01-03' })
})
it('requires payout/refund references and rejection reason, and guards workflow status', async () => {
  expect(await actionSchema('approve').isValid({ text: '' })).toBe(true)
  expect(await actionSchema('reject').isValid({ text: ' ' })).toBe(false)
  expect(await actionSchema('reject').isValid({ text: 'x'.repeat(1001) })).toBe(false)
  expect(await actionSchema('pay').isValid({ text: 'BANK123' })).toBe(true)
  expect(await actionSchema('confirmRefund').isValid({ text: 'x'.repeat(121) })).toBe(false)
  expect(actionAllowed('pay', { status: 1, payoutAmount: 0 })).toBe(false)
  expect(actionAllowed('pay', { status: 2, payoutAmount: 80000 })).toBe(false)
  expect(actionAllowed('confirmRefund', { status: 2 })).toBe(true)
  expect(actionAllowed('approve', { status: 4 })).toBe(false)
  expect(commissionSnapshot({ merchantId, payoutAmount: 2 })).not.toBe(commissionSnapshot({ merchantId, payoutAmount: 1 }))
})
