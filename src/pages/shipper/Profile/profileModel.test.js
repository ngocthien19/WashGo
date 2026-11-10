import { expect, it } from 'vitest'
import { profileSchema, profilePayload, profileSnapshot } from './profileModel'
const values = { fullName: 'Delivery staff', phone: '+84 901 234 567', vehicleType: 1, vehiclePlate: '59-x1 12345' }
it('requires plates for motor vehicles, allows a bicycle without a plate', async () => {
  expect(await profileSchema.isValid(values)).toBe(true)
  expect(await profileSchema.isValid({ ...values, vehiclePlate: '' })).toBe(false)
  expect(await profileSchema.isValid({ ...values, vehicleType: 3, vehiclePlate: '' })).toBe(true)
  expect(await profileSchema.isValid({ ...values, vehicleType: 0 })).toBe(false)
})
it('normalizes editable fields and preserves the avatar keep/remove distinction', () => {
  expect(profilePayload(values, null)).toEqual({ ...values, phone: '84901234567', vehiclePlate: '59-X1 12345', avatarUrl: null })
  expect(profilePayload(values, '').avatarUrl).toBe('')
})
it('detects editable changes without blocking on unrelated delivery statistics', () => {
  expect(profileSnapshot({ ...values, totalDeliveries: 10 })).toBe(profileSnapshot({ ...values, totalDeliveries: 11 }))
  expect(profileSnapshot(values)).not.toBe(profileSnapshot({ ...values, phone: '0901000000' }))
})
