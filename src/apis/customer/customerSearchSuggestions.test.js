import { beforeEach, expect, it, vi } from 'vitest'
import { customerCatalogApi } from './customerCatalogApi'
import { customerSuggestionLoader } from './customerSearchSuggestions'

vi.mock('./customerCatalogApi', async (importOriginal) => ({
  ...await importOriginal(),
  customerCatalogApi: { getServices: vi.fn(), getLockers: vi.fn() }
}))

beforeEach(() => vi.clearAllMocks())

it('searches with normalized text and current filters, preserving image and price', async () => {
  const signal = new AbortController().signal
  customerCatalogApi.getServices.mockResolvedValue({ list: [{ id: 's', name: 'Service', code: 'S01', unitPrice: 50000, unit: 'cái', images: '["/uploads/service.jpg"]' }] })
  const items = await customerSuggestionLoader('service', { page: 4, serviceTypes: [2] })('  SeRVicE  ', signal)
  expect(customerCatalogApi.getServices).toHaveBeenCalledWith({ page: 1, take: 50, keyword: 'service', serviceTypes: [2] }, signal)
  expect(items[0]).toMatchObject({ label: 'Service', code: 'S01', images: ['/uploads/service.jpg'] })
  expect(items[0].price).toContain('50.000')
  expect(items[0].price).toContain('cái')
})

it('collects every server page without truncating the dropdown to five results', async () => {
  customerCatalogApi.getServices.mockImplementation(async ({ page }) => ({
    totalPages: 3,
    list: Array.from({ length: 3 }, (_, index) => ({ id: `${page}-${index}`, name: `Service ${page}-${index}` }))
  }))
  const items = await customerSuggestionLoader('service')('service')
  expect(items).toHaveLength(9)
  expect(items.at(-1).label).toBe('Service 3-2')
  expect(customerCatalogApi.getServices).toHaveBeenCalledTimes(3)
})

it('stops loading additional pages when the query is cancelled', async () => {
  const controller = new AbortController()
  customerCatalogApi.getServices.mockImplementation(async () => {
    controller.abort()
    return { totalPages: 3, list: [{ id: '1', name: 'Service' }] }
  })
  await expect(customerSuggestionLoader('service')('service', controller.signal)).rejects.toThrow()
  expect(customerCatalogApi.getServices).toHaveBeenCalledTimes(1)
})

it('retains the full locker address and omits unrelated private payload fields', async () => {
  customerCatalogApi.getLockers.mockResolvedValue({ list: [{ id: 'l', name: 'Locker', address: '123 Street', city: 'City', imageUrls: ['/uploads/locker.jpg'], merchantName: 'Private' }] })
  const [item] = await customerSuggestionLoader('locker')('STREET')
  expect(item.description).toContain('123 Street')
  expect(item.description).toContain('City')
  expect(item.images).toEqual(['/uploads/locker.jpg'])
  expect(item).not.toHaveProperty('merchantName')
})
