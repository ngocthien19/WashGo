import { describe, expect, it } from 'vitest'
import { buildServiceFilter, getPriceRangeError, initialServiceQuery, readServiceQuery, writeServiceQuery } from './serviceCatalogQuery'
import { SERVICE_PRICE_RANGES } from '~/utils/constants'

describe('service catalog query', () => {
  it.each([
    ['under-30000', undefined, 29999.99],
    ['30000-50000', 30000, 50000],
    ['50000-100000', 50000, 100000],
    ['over-100000', 100000.01, undefined]
  ])('maps preset %s to inclusive bounds at the backend price precision', (value, min, max) => {
    const range = SERVICE_PRICE_RANGES.find((option) => option.value === value)
    const query = { ...initialServiceQuery, minPrice: range.minPrice, maxPrice: range.maxPrice }
    expect(buildServiceFilter(query)).toMatchObject({ minPrice: min, maxPrice: max })
    expect(readServiceQuery(writeServiceQuery(query))).toEqual(query)
  })
  it('keeps combined filters, sorting and pagination when sharing a URL', () => {
    const query = { keyword: 'giặt', serviceType: '2', minPrice: '0', maxPrice: '80000', sort: 'price-desc', page: 3 }
    expect(readServiceQuery(writeServiceQuery(query))).toEqual(query)
    expect(buildServiceFilter(query)).toEqual({
      keyword: 'giặt', serviceType: 2, minPrice: 0, maxPrice: 80000, page: 3, take: 6,
      sortBy: [{ field: 'UnitPrice', isDescending: true }, { field: 'Name', isDescending: false }]
    })
  })

  it.each(['-1', 'Infinity', '1e5', '30,000', 'abc', '9007199254740992'])('rejects an invalid price %s', (value) => {
    expect(getPriceRangeError(value, '')).toBe('customer.serviceCatalog.invalidPrice')
  })

  it('accepts open-ended, zero, equal and decimal bounds while rejecting a reversed range', () => {
    expect(getPriceRangeError('', '')).toBe('')
    expect(getPriceRangeError('0', '')).toBe('')
    expect(getPriceRangeError('', '0')).toBe('')
    expect(getPriceRangeError(' 0.5 ', '0.5')).toBe('')
    expect(getPriceRangeError('100', '99')).toBe('customer.serviceCatalog.invalidRange')
    expect(buildServiceFilter({ ...initialServiceQuery, minPrice: '0.5' }).minPrice).toBe(0.5)
  })

  it('sanitizes an invalid deep link instead of sending NaN or unsupported filters to the API', () => {
    expect(readServiceQuery(new URLSearchParams('page=-2&serviceType=99&sort=Code&minPrice=200&maxPrice=100')))
      .toEqual(initialServiceQuery)
    expect(readServiceQuery(new URLSearchParams('page=Infinity&minPrice=NaN'))).toEqual(initialServiceQuery)
    expect(writeServiceQuery(initialServiceQuery).toString()).toBe('')
    const filter = buildServiceFilter(initialServiceQuery)
    expect(filter.minPrice).toBeUndefined()
    expect(filter.serviceType).toBeUndefined()
    expect(filter.sortBy[0]).toEqual({ field: 'Name', isDescending: false })
  })
})
