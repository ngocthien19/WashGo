import { expect, it } from 'vitest'
import { proposalSchema, readServiceQuery, serviceFilter } from './serviceModel'
const draft = { name: ' Test service ', unit: 'kg', unitPrice: 50000, pricePerKg: '', pricePerItem: '', serviceType: 1, estimatedDurationHours: 24, description: '', reason: '' }
it('normalizes optional amounts without treating zero as blank', async () => {
  expect(await proposalSchema.validate(draft)).toMatchObject({ name: 'Test service', pricePerKg: null, pricePerItem: null })
  await expect(proposalSchema.validate({ ...draft, pricePerKg: 0 })).rejects.toThrow()
  await expect(proposalSchema.validate({ ...draft, unitPrice: 1.234 })).rejects.toThrow()
  await expect(proposalSchema.validate({ ...draft, estimatedDurationHours: 1.5 })).rejects.toThrow()
})
it('rejects over-limit and invalid proposal data', async () => {
  await expect(proposalSchema.validate({ ...draft, unitPrice: 100000001 })).rejects.toThrow()
  await expect(proposalSchema.validate({ ...draft, reason: 'x'.repeat(1001) })).rejects.toThrow()
  await expect(proposalSchema.validate({ ...draft, unit: ' ' })).rejects.toThrow()
})
it('keeps inactive catalog filters and discards unsupported proposal search fields', () => {
  expect(serviceFilter(readServiceQuery(new URLSearchParams('state=false&type=5&page=2')))).toMatchObject({ isActive: false, serviceType: 5, page: 2 })
  expect(serviceFilter(readServiceQuery(new URLSearchParams('tab=proposals&state=3&type=2&keyword=hidden')))).toEqual({ status: 3, requestType: 2, page: 1, take: 12 })
  expect(readServiceQuery(new URLSearchParams('tab=bad&state=99&page=-1'))).toMatchObject({ tab: 'catalog', state: '', page: 1 })
})
