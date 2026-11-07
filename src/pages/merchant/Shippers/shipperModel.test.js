import { describe, it, expect } from 'vitest'
import { readShipperQuery, shipperFilter, shipperSchema } from './shipperModel'

const valid = { fullName: ' Test Driver ', phone: '+84 901234567', email: 'Driver@example.test', vehicleType: 1, vehiclePlate: '59-a123', identityNumber: '', isActive: true }
describe('merchant shipper management', () => {
  it('preserves false availability and rejects invalid URL filters', () => {
    expect(shipperFilter(readShipperQuery(new URLSearchParams('isActive=false&status=2&page=3')))).toMatchObject({ isActive: false, status: 2, page: 3, take: 12 })
    expect(readShipperQuery(new URLSearchParams('isActive=0&status=99&page=-1'))).toMatchObject({ isActive: '', status: '', page: 1 })
  })
  it('validates vehicle-specific plate and optional identity rules', async () => {
    expect(await shipperSchema.validate(valid)).toMatchObject({ fullName: 'Test Driver', email: 'driver@example.test', vehiclePlate: '59-A123' })
    await expect(shipperSchema.validate({ ...valid, vehiclePlate: '' })).rejects.toThrow()
    await expect(shipperSchema.validate({ ...valid, vehicleType: 3, vehiclePlate: '' })).resolves.toBeTruthy()
    await expect(shipperSchema.validate({ ...valid, identityNumber: '1234' })).rejects.toThrow()
    await expect(shipperSchema.validate({ ...valid, phone: 'abc0901234567' })).rejects.toThrow()
  })
})
