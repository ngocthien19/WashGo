import { expect, it } from 'vitest'
import { depositTime } from './useDepositDeadline'
it('uses server time instead of the device clock and expires after elapsed time', () => {
  const order = { serverNow: '2026-11-01T10:00:00Z', depositDeadline: '2026-11-01T10:00:30Z' }
  expect(depositTime(order)).toMatchObject({ seconds: 30, expired: false })
  expect(depositTime(order, 30000)).toMatchObject({ seconds: 0, expired: true })
  expect(depositTime({ ...order, isDepositExpired: true }).expired).toBe(true)
})
it('never invents a deadline when server timestamps are absent', () => {
  expect(depositTime({ createdOn: Date.now() })).toEqual({ available: false, expired: false })
  expect(depositTime({ isDepositExpired: true }).expired).toBe(true)
})
