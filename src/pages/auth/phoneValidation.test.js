import { expect, it } from 'vitest'
import { registerSchema } from './authSchemas'
import { accountSchema } from '~/pages/admin/Accounts/accountModel'
import { merchantSchema } from '~/pages/admin/Merchants/merchantModel'
import { merchantProfileSchema } from '~/pages/merchant/Profile/profileModel'
import { shipperSchema } from '~/pages/merchant/Shippers/shipperModel'
import { profileSchema as shipperProfileSchema } from '~/pages/shipper/Profile/profileModel'

const schemas = [
  ['Register', registerSchema],
  ['Admin Merchant', merchantSchema],
  ['Merchant profile', merchantProfileSchema()],
  ['Merchant Shipper', shipperSchema],
  ['Shipper profile', shipperProfileSchema]
]
it.each(schemas)('%s accepts only ten digits starting with zero', async (_name, schema) => {
  for (const phone of ['0901234567', ' 0901234567 ']) {
    await expect(schema.validateAt('phone', { phone })).resolves.toBe('0901234567')
  }
  for (const phone of ['901234567', '09012345678', '1901234567', '+84901234567', '090 123 4567', '090-123-4567', '090123456x']) {
    await expect(schema.validateAt('phone', { phone })).rejects.toThrow()
  }
})
it.each(['Customer', 'Merchant', 'Shipper', 'Admin'])('applies the same phone rule when creating and editing %s accounts', async role => {
  for (const editing of [true, false]) {
    await expect(accountSchema(editing).validateAt('phone', { role, phone: '0901234567' })).resolves.toBe('0901234567')
    for (const phone of ['901234567', '09012345678', '1901234567', '+84901234567', '090 123 4567']) {
      await expect(accountSchema(editing).validateAt('phone', { role, phone })).rejects.toThrow()
    }
  }
})
