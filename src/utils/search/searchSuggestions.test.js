import { expect, it, vi } from 'vitest'
import { loadSuggestionPages, resourceSuggestion } from './searchSuggestions'

it('keeps the endpoint and all scope filters while reading every page', async () => {
  const load = vi.fn(async ({ page }) => ({ list: [{ id: String(page) }], totalPages: 3 }))
  const signal = new AbortController().signal
  const items = await loadSuggestionPages(load, { merchantId: 'scope', taskType: 2, take: 12, page: 9 }, '  MIXED Case ', signal)
  expect(items).toHaveLength(3)
  expect(load.mock.calls.map(([body]) => body.page)).toEqual([1, 2, 3])
  expect(load).toHaveBeenLastCalledWith({ merchantId: 'scope', taskType: 2, take: 12, page: 3, keyword: 'mixed case' }, signal)
})

it('uses proposal images/name/price and preserves a separate ID per task or delivery event', () => {
  const service = resourceSuggestion({ id: 'proposal', proposed: { name: 'Proposed service', code: 'SVC', unitPrice: 50000, unit: 'kg', imageUrls: ['/uploads/service.jpg'] } }, 'service')
  expect(service).toMatchObject({ id: 'proposal', label: 'Proposed service', images: ['/uploads/service.jpg'] })
  expect(service.fields.join(' ')).toContain('50.000')
  expect(resourceSuggestion({ id: 'order', taskId: 'task', orderCode: 'WG', pinCode: 'PRIVATE', customerPhone: 'PRIVATE' })).toMatchObject({ id: 'task', label: 'WG' })
  expect(resourceSuggestion({ eventId: 'event', orderId: 'order', orderCode: 'WG' }).id).toBe('event')
  expect(JSON.stringify(resourceSuggestion({ eventId: 'event', orderCode: 'WG', customerName: 'PRIVATE' }, 'delivery'))).not.toContain('PRIVATE')
  expect(JSON.stringify(resourceSuggestion({ id: 'order', orderCode: 'WG', pinCode: 'PRIVATE', customerPhone: 'PRIVATE' }))).not.toContain('PRIVATE')
})

it('keeps matching contact/vehicle/address fields available and ignores incomplete resources', () => {
  expect(resourceSuggestion({ id: 'driver', fullName: 'Driver', phone: '0901234567', email: 'driver@example.test', vehiclePlate: '59-A123' }, 'shipper').fields).toEqual(['Driver', '0901234567', 'driver@example.test', '59-A123'])
  expect(resourceSuggestion({ id: 'locker', name: 'Station', address: '123 Street', city: 'City' }, 'locker').fields.join(' ')).toContain('123 Street')
  expect(resourceSuggestion({ id: 'anonymous', contentReleased: false })).toBeNull()
})
