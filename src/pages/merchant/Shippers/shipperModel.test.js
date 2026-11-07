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
  it('keeps rating sorting in URL and passes it to server before paging', () => {
    expect(shipperFilter(readShipperQuery(new URLSearchParams('ratingSort=desc&page=2')))).toMatchObject({ page: 2, sortBy: [{ field: 'Rating', isDescending: true }] })
    expect(shipperFilter(readShipperQuery(new URLSearchParams('ratingSort=unsupported'))).sortBy).toBeUndefined()
  })
})
