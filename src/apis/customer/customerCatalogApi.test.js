import { beforeEach, describe, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { customerCatalogApi } from './customerCatalogApi'

vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

beforeEach(() => vi.resetAllMocks())

describe('customer catalog API', () => {
  it('posts the filter body to the new endpoint and retains pagination metadata', async () => {
    const response = { succeeded: true, list: [], total: 0, currentPage: 1, totalPages: 0 }
    authorizedAxios.post.mockResolvedValue({ data: response })
    const body = { keyword: 'wash', serviceType: 1, minPrice: 0, maxPrice: 50000, page: 1, take: 6, sortBy: [{ field: 'UnitPrice', isDescending: true }] }
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
