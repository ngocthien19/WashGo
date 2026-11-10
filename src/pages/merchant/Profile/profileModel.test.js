import { expect, it } from 'vitest'
import { merchantProfileSchema, profileSnapshot } from './profileModel'
const values = { businessName: 'Store', address: '123 Test', city: 'City', phone: '0901234567', openingHours: '', taxCode: '' }
it('validates edited tax codes while allowing unchanged legacy values and explicit clearing', async () => {
  for (const taxCode of ['', '1234567890', '1234567890-001']) {
    await expect(merchantProfileSchema().validate({ ...values, taxCode })).resolves.toMatchObject({ taxCode })
  }
  await expect(merchantProfileSchema().validate({ ...values, taxCode: '123' })).rejects.toThrow('merchant.backendSync.invalidTaxCode')
  await expect(merchantProfileSchema('legacy-tax').validate({ ...values, taxCode: 'legacy-tax' })).resolves.toBeTruthy()
})
it('detects changes to current legal documents and location before submitting an approval request', () => {
  const profile = { ...values, businessLicenseDocumentId: 'old', latitude: 0, longitude: 0 }
  expect(profileSnapshot(profile)).not.toBe(profileSnapshot({ ...profile, businessLicenseDocumentId: 'new' }))
  expect(profileSnapshot(profile)).not.toBe(profileSnapshot({ ...profile, longitude: 1 }))
})
