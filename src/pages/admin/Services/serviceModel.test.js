import { expect, it } from 'vitest'
import { readQuery, filter, defaults, payload, serviceSchema, snapshot } from './serviceModel'
it('supports false availability and separates catalog approval from proposal status', () => {
  expect(filter(readQuery(new URLSearchParams('state=false&approval=2&page=2')))).toMatchObject({ isActive: false, approvalStatus: 2, page: 2, take: 12 })
  expect(filter(readQuery(new URLSearchParams('tab=proposals&state=1&type=2')))).toMatchObject({ status: 1, requestType: 2 })
})
it('requires code and valid prices and preserves existing service ownership and availability', async () => {
  const service = { id: 'one', merchantId: 'merchant', code: 'SVC1', name: 'Wash', unitPrice: 50000, isActive: false }
  const value = defaults(service)
  expect(await serviceSchema.isValid(value)).toBe(true)
  expect(await serviceSchema.isValid({ ...value, code: '' })).toBe(false)
  expect(await serviceSchema.isValid({ ...value, unitPrice: 0 })).toBe(false)
  expect(payload({ ...value, isActive: true }, service)).toMatchObject({ id: 'one', merchantId: 'merchant', isActive: false, pricePerKg: null })
  expect(snapshot(service)).not.toBe(snapshot({ ...service, unitPrice: 60000 }))
})
