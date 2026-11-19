import { expect, it } from 'vitest'
import { categoryDefaults, categorySchema, categoryQuery } from './categoryModel'
import { proposalSchema } from '~/pages/merchant/Services/serviceModel'

it('normalizes category names, strips server-owned codes and rejects HTML and sort limits', async () => {
  const values = { ...categoryDefaults(), code: 'NEW_6', name: '  Special   care  ' }
  expect((await categorySchema.validate(values)).name).toBe('Special care')
  expect(await categorySchema.validate(values)).not.toHaveProperty('code')
  expect(await categorySchema.isValid({ ...values, code: '' })).toBe(true)
  for (const patch of [{ name: '<script>' }, { description: '<b>unsafe</b>' }, { sortOrder: -1 }, { sortOrder: 1.5 }]) {
    expect(await categorySchema.isValid({ ...values, ...patch })).toBe(false)
  }
})
it('keeps arbitrary UUID categories separate from processing type and normalizes filter input', async () => {
  const draft = { categoryId: 'ca000000-0000-0000-0000-000000000001', name: 'Wash', serviceType: 1, unit: 'kg', unitPrice: 30000, estimatedDurationHours: 24 }
  expect(await proposalSchema.isValid(draft)).toBe(true)
  expect(await proposalSchema.isValid({ ...draft, categoryId: '1' })).toBe(false)
  expect(categoryQuery(new URLSearchParams('active=false&sort=invalid&page=-2'))).toMatchObject({ isActive: false, sortBy: 'sortOrder', page: 1 })
})
