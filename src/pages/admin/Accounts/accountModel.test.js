import { describe, expect, it } from 'vitest'
import { accountQuery, accountSchema, accountPayload } from './accountModel'
const customer = { role: 'Customer', fullName: 'Test Customer', email: 'test@example.test', phone: '0901234567', vehicleType: 1 }
describe('account filters and payloads', () => {
  it('validates server filters and inclusive Vietnam date bounds', () => {
    const value = accountQuery(new URLSearchParams('role=Unknown&page=-3&deleted=bad&sortBy=deletedAt&from=2026-11-21&to=2026-11-21'))
    expect(value).toMatchObject({ page: 1, take: 20, role: undefined, deleted: 'Exclude', sortBy: 'createdAt' })
    expect(value.createdTo - value.createdFrom).toBe(86399)
    expect(accountQuery(new URLSearchParams('from=invalid')).createdFrom).toBeUndefined()
  })
  it('matches account phone rules, rejects HTML names and requires partner data', async () => {
    await expect(accountSchema(false).validate(customer)).resolves.toMatchObject(customer)
    await expect(accountSchema(false).validate({ ...customer, phone: '+84901234567' })).rejects.toBeTruthy()
    await expect(accountSchema(false).validate({ ...customer, fullName: '<b>Name</b>' })).rejects.toBeTruthy()
    await expect(accountSchema(false).validate({ ...customer, role: 'Merchant' })).rejects.toBeTruthy()
    await expect(accountSchema(false).validate({ ...customer, role: 'Shipper' })).rejects.toBeTruthy()
    await expect(accountSchema(false).validate({ ...customer, role: 'Shipper', merchantId: 'ac000000-0000-0000-0000-000000000004', vehiclePlate: '59A-12345' })).resolves.toBeTruthy()
    await expect(accountSchema(true).validate({ ...customer, phone: '' })).rejects.toBeTruthy()
    await expect(accountSchema(true).validate({ ...customer, role: 'Admin', phone: '' })).resolves.toBeTruthy()
  })
  it('does not leak role or email into edits and nests partner creation correctly', () => {
    expect(accountPayload(customer, true, '')).toEqual({ fullName: 'Test Customer', phone: '0901234567', avatarUrl: '' })
    const merchant = accountPayload({ ...customer, role: 'Merchant', address: '123 Street', city: 'City', latitude: 10, longitude: 106 }, false)
    expect(merchant).toEqual({ role: 'Merchant', merchant: { businessName: 'Test Customer', email: customer.email, phone: customer.phone, address: '123 Street', city: 'City', latitude: 10, longitude: 106 } })
    expect(merchant.merchant).not.toHaveProperty('district')
    expect(merchant.merchant).not.toHaveProperty('depositAmount')
  })
})
