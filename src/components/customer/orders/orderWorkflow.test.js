import { describe, expect, it } from 'vitest'
import { getOrderProgress, canPrintReceipt, canPickupFromLocker } from './orderWorkflow'

describe('order workflow display', () => {
  it('offers normal locker pickup only for ready and paid orders', () => {
    expect(canPickupFromLocker({ status: 10, paymentStatus: 2 })).toBe(true)
    for (const status of [1, 2, 4, 8, 9, 11, 12, 13, 99]) {
      expect(canPickupFromLocker({ status, paymentStatus: 2 })).toBe(false)
    }
    expect(canPickupFromLocker({ status: 10, paymentStatus: 1 })).toBe(false)
    expect(canPickupFromLocker({ status: 10, paymentStatus: 3 })).toBe(false)
  })
  it('counts status milestones instead of inventing time or AI completion estimates', () => {
    expect(getOrderProgress({ status: 1 })).toBe(0)
    expect(getOrderProgress({ status: 12 })).toBe(100)
    expect(getOrderProgress({ status: 4 })).toBe(27)
    expect(getOrderProgress({ status: 99 })).toBeNull()
    expect(getOrderProgress({ status: 99, cancellationFromStatus: 2 })).toBe(9)
    expect(getOrderProgress({ status: 13, timeline: [{ status: 8, timestamp: 2 }, { status: 4, timestamp: 1 }] })).toBe(64)
  })
  it('never prints an invoice for a new order, unpaid order or a refunded order', () => {
    expect(canPrintReceipt({ status: 12, paymentStatus: 2 })).toBe(true)
    for (const order of [{ status: 1, paymentStatus: 1 }, { status: 10, paymentStatus: 2 }, { status: 12, paymentStatus: 1 }, { status: 12, paymentStatus: 3 }]) {
      expect(canPrintReceipt(order)).toBe(false)
    }
  })
})
