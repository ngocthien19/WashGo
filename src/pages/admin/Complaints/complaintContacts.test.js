import { expect, it } from 'vitest'
import { customerContact, merchantContact } from './complaintContacts'
it('keeps absent or masked customer details empty and uses enriched DTO values when supplied', () => {
  expect(customerContact({ customerName: 'Customer', customerPhoneNumber: '***' })).toMatchObject({ email: null, phone: null, imageUrls: [] })
  expect(customerContact({ customerName: 'Customer', customerEmail: 'c@example.test', customerPhone: '0901000001', customerAvatarUrl: '/uploads/c.png' })).toMatchObject({ email: 'c@example.test', phone: '0901000001', imageUrls: ['/uploads/c.png'] })
})
it('merges current Merchant lookup data without inventing a relation or overriding enriched values', () => {
  expect(merchantContact({}, { name: 'Store', email: 'm@example.test', phone: '0903000003', imageUrls: ['/uploads/m.png'] })).toEqual({ name: 'Store', email: 'm@example.test', phone: '0903000003', imageUrls: ['/uploads/m.png'] })
  expect(merchantContact({ merchantPhone: 'NEW' }, { phone: 'OLD' }).phone).toBe('NEW')
})
