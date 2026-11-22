import { expect, it } from 'vitest'
import { proposalSchema, readServiceQuery, serviceFilter } from './serviceModel'
const draft = { categoryId: 'ca000000-0000-4000-8000-000000000001', name: ' Test service ', unit: 'kg', unitPrice: 50000, pricePerKg: '', pricePerItem: '', serviceType: 1, estimatedDurationHours: 24, description: '', reason: '' }
it('sends proposal category together with the other server filters', () => {
  const query = readServiceQuery(new URLSearchParams(`tab=proposals&categoryId=${draft.categoryId}&state=1&type=2&page=2`))
  expect(serviceFilter(query)).toMatchObject({ categoryIds: [draft.categoryId], status: 1, requestType: 2, page: 2 })
})
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
it('keeps inactive catalog filters and keeps proposal search fields', () => {
  expect(serviceFilter(readServiceQuery(new URLSearchParams('state=false&type=5&page=2')))).not.toHaveProperty('serviceType')
  expect(serviceFilter(readServiceQuery(new URLSearchParams('state=false&type=5&page=2')))).toMatchObject({ isActive: false, page: 2 })
  expect(serviceFilter(readServiceQuery(new URLSearchParams('tab=proposals&state=3&type=2&keyword=hidden')))).toMatchObject({ status: 3, requestType: 2, keyword: 'hidden', page: 1, take: 12 })
  expect(readServiceQuery(new URLSearchParams('tab=bad&state=99&page=-1'))).toMatchObject({ tab: 'catalog', state: '', page: 1 })
})

it('enforces the same maximum and decimal precision on every optional price', async () => {
  await expect(proposalSchema.validate({ ...draft, pricePerKg: 100000001 })).rejects.toThrow()
  await expect(proposalSchema.validate({ ...draft, pricePerItem: 2.345 })).rejects.toThrow()
})
it('normalizes sorting and only passes a valid service ID for proposal filtering', () => {
  expect(serviceFilter(readServiceQuery(new URLSearchParams('sort=priceDesc')))).toMatchObject({ sortBy: [{ field: 'UnitPrice', isDescending: true }] })
  expect(readServiceQuery(new URLSearchParams('tab=proposals&serviceId=invalid&sort=invalid'))).toMatchObject({ serviceId: '', sort: 'name' })
})

it('supports dynamic categories with no legacy service type and strips a stale type', async () => {
  const dynamic = { ...draft, categoryId: 'ca000000-0000-0000-0000-000000000006', serviceType: null }
  expect(await proposalSchema.validate(dynamic)).not.toHaveProperty('serviceType')
  const categoryOnly = { ...draft }; delete categoryOnly.serviceType
  expect(await proposalSchema.isValid(categoryOnly)).toBe(true)
})
