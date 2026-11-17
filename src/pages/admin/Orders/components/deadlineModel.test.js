import { expect, it } from 'vitest'
import { ORDER_DEADLINES, orderDeadline } from './deadlineModel'

const base = { status: 1, paymentStatus: 1, serverNow: '2026-11-15T10:00:00Z', depositDeadline: '2026-11-15T10:01:00Z' }
it('uses server time and elapsed time, and updates exactly at the deadline', () => {
  expect(orderDeadline(base, ORDER_DEADLINES[0])).toMatchObject({ active: true, expired: false, seconds: 60 })
  expect(orderDeadline(base, ORDER_DEADLINES[0], 60000)).toMatchObject({ expired: true, seconds: 0 })
  expect(orderDeadline(base, ORDER_DEADLINES[0], 90000)).toMatchObject({ expired: true, seconds: -30 })
})
it('does not label historical deadlines overdue after the workflow has moved on', () => {
  for (const definition of ORDER_DEADLINES) {
    expect(orderDeadline({ ...base, status: 12, [definition.field]: '2026-11-14T10:00:00Z', [definition.flag]: true }, definition)).toMatchObject({ active: false, expired: false, seconds: null })
  }
  expect(orderDeadline({ ...base, status: 8, paymentStatus: 2, isPaymentOverdue: true }, ORDER_DEADLINES[1]).active).toBe(false)
})
it('supports payment and pickup deadlines without inventing dates or local-time fallbacks', () => {
  for (const [index, status] of [[1, 8], [2, 10]]) {
    const definition = ORDER_DEADLINES[index]
    expect(orderDeadline({ ...base, status, [definition.field]: '2026-11-15T09:00:00Z' }, definition)).toMatchObject({ active: true, expired: true, seconds: -3600 })
  }
  expect(orderDeadline({ ...base, serverNow: undefined }, ORDER_DEADLINES[0])).toMatchObject({ seconds: null, expired: false })
  expect(orderDeadline({ ...base, depositDeadline: null, isDepositExpired: true }, ORDER_DEADLINES[0])).toMatchObject({ date: null, seconds: null, expired: true })
})
