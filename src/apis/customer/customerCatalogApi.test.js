import { beforeEach, describe, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { customerCatalogApi, catalogImages, lockerSlots } from './customerCatalogApi'

vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

beforeEach(() => vi.resetAllMocks())

describe('customer catalog API', () => {
  it('retains all compartment states and accepts a valid locker with no available compartments', async () => {
    const locker = { id: 'locker', availableSlotCount: 0, availableSlots: [], slots: [2, 3, 4].map(status => ({ id: `slot-${status}`, slotNumber: status, size: 2, status })) }
    authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: locker } })
    expect(lockerSlots(await customerCatalogApi.getLocker('locker'))).toEqual(locker.slots)
    expect((await customerCatalogApi.getLocker('locker')).availableSlots).toEqual([])
  })
  it('reads both media contracts and tolerates missing or malformed legacy images', () => {
    expect(catalogImages({ images: '["/uploads/one.png"]' })).toEqual(['/uploads/one.png'])
    expect(catalogImages({ imageUrls: ['/uploads/new.png'], images: '["old"]' })).toEqual(['/uploads/new.png'])
    expect(catalogImages({ images: '/uploads/legacy.png' })).toEqual(['/uploads/legacy.png'])
    expect(catalogImages({ images: '{invalid' })).toEqual([])
    expect(catalogImages(null)).toEqual([])
  })
  it('never infers occupied slots from counts and preserves explicit slot states', () => {
    expect(lockerSlots({ availableSlotCount: 4, availableSlots: [{ id: 'one' }] })).toEqual([{ id: 'one', status: 1 }])
    expect(lockerSlots({ slots: [{ id: 'two', status: 2 }], availableSlots: [{ id: 'one' }] })).toEqual([{ id: 'two', status: 2 }])
  })
  it('collects distinct cities across every locker page without legacy district options', async () => {
    authorizedAxios.get
      .mockResolvedValueOnce({ data: { succeeded: true, list: [{ city: 'City B', district: 'Legacy district' }, { city: 'City A' }], totalPages: 2 } })
      .mockResolvedValueOnce({ data: { succeeded: true, list: [{ city: 'City A' }, { city: '' }], totalPages: 2 } })
    await expect(customerCatalogApi.getLockerAreas()).resolves.toEqual([{ city: 'City A' }, { city: 'City B' }])
    expect(authorizedAxios.get).toHaveBeenCalledTimes(2)
    expect(authorizedAxios.get.mock.calls[1][1].params.page).toBe(2)
  })

  it('posts the filter body to the new endpoint and retains pagination metadata', async () => {
    const response = { succeeded: true, list: [], total: 0, currentPage: 1, totalPages: 0 }
    authorizedAxios.post.mockResolvedValue({ data: response })
    const body = { keyword: 'wash', serviceTypes: [1, 2], priceRanges: [{ minPrice: 0, maxPrice: 50000 }], page: 1, take: 6, sortBy: [{ field: 'UnitPrice', isDescending: true }] }
    const signal = new AbortController().signal
    await expect(customerCatalogApi.getServices(body, signal)).resolves.toBe(response)
    expect(authorizedAxios.post).toHaveBeenCalledWith('/customer/services/filter', body, { signal })
    expect(authorizedAxios.get).not.toHaveBeenCalled()
  })

  it('keeps detail requests on GET /customer/services/{id}', async () => {
    const service = { id: 'service-1', unitPrice: 30000 }
    authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: service } })
    await expect(customerCatalogApi.getService('service-1')).resolves.toBe(service)
    expect(authorizedAxios.get).toHaveBeenCalledWith('/customer/services/service-1', { signal: undefined })
  })

  it('rejects failed filter envelopes instead of showing them as an empty result', async () => {
    authorizedAxios.post.mockResolvedValue({ data: { succeeded: false, message: 'invalid filter' } })
    await expect(customerCatalogApi.getServices({ page: 1, take: 3 })).rejects.toThrow('invalid filter')
  })
})
