import { expect, it } from 'vitest'
import { canAssignShipper, hasShipperCapacity, isShipperCapacityConflict, shipperBlockedKey } from './shipperCapacity'

it('uses explicit eligibility including reassignment to the same Shipper at capacity', () => {
  const row = { activeTaskCount: 1, maxActiveTasks: 3, remainingTaskCapacity: 2, canAssign: true }
  expect(canAssignShipper(row)).toBe(true)
  expect(canAssignShipper({ ...row, activeTaskCount: 3, remainingTaskCapacity: 0 })).toBe(true)
  expect(canAssignShipper({ ...row, canAssign: false })).toBe(false)
  expect(canAssignShipper({ activeTaskCount: 0 })).toBe(false)
  expect(hasShipperCapacity({ ...row, remainingTaskCapacity: 5 })).toBe(false)
  expect(hasShipperCapacity({ ...row, activeTaskCount: 4, remainingTaskCapacity: 0 })).toBe(true)
  expect(shipperBlockedKey({ blockedReasonCode: 'ShipperCapacityExceeded' })).toBe('shipperCapacity.reasons.ShipperCapacityExceeded')
  expect(isShipperCapacityConflict({ response: { status: 409, data: { meta: { code: 'ShipperCapacityExceeded' } } } })).toBe(true)
  expect(isShipperCapacityConflict({ response: { status: 500 } })).toBe(false)
})
