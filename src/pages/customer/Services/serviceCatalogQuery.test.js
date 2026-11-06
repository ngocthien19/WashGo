import { describe, expect, it } from 'vitest'
import { buildServiceFilter, getPriceRangeError, initialServiceQuery, readServiceQuery, writeServiceQuery } from './serviceCatalogQuery'

describe('service catalog query', () => {
  it.each([
    ['under-30000', undefined, 29999.99],
    ['30000-50000', 30000, 50000],
    ['50000-100000', 50000, 100000],
    ['over-100000', 100000.01, undefined]
  ])('maps checkbox preset %s to inclusive backend bounds', (value, minPrice, maxPrice) => {
    const query = { ...initialServiceQuery, priceRanges: [value] }
    expect(buildServiceFilter(query).priceRanges).toEqual([{ minPrice, maxPrice }])
    expect(readServiceQuery(writeServiceQuery(query))).toEqual(query)
  })

  it('shares multiple types and disjoint ranges while keeping keyword, sort and page', () => {
    const query = { ...initialServiceQuery, keyword: 'silk', serviceTypes: ['2', '3'], priceRanges: ['under-30000', 'over-100000'], sort: 'price-desc', page: 3 }
    expect(readServiceQuery(writeServiceQuery(query))).toEqual(query)
    expect(buildServiceFilter(query)).toEqual({
      keyword: 'silk', serviceTypes: [2, 3], priceRanges: [{ minPrice: undefined, maxPrice: 29999.99 }, { minPrice: 100000.01, maxPrice: undefined }],
      page: 3, take: 6, sortBy: [{ field: 'UnitPrice', isDescending: true }, { field: 'Name', isDescending: false }]
    })
  })

  it('migrates legacy links and removes duplicate or unsupported choices', () => {
    const query = readServiceQuery(new URLSearchParams('serviceType=2&serviceType=2&serviceType=99&priceRange=invalid&minPrice=30000&maxPrice=50000'))
    expect(query).toEqual({ ...initialServiceQuery, serviceTypes: ['2'], priceRanges: ['30000-50000'] })
    const custom = readServiceQuery(new URLSearchParams('minPrice=0&maxPrice=80000'))
    expect(buildServiceFilter(custom).priceRanges).toEqual([{ minPrice: 0, maxPrice: 80000 }])
    expect(readServiceQuery(writeServiceQuery(custom))).toEqual(custom)
  })

  it.each(['-1', 'Infinity', '1e5', '30,000', 'abc', '9007199254740992'])('rejects invalid legacy price %s', (value) => {
    expect(getPriceRangeError(value, '')).toBe('customer.serviceCatalog.invalidPrice')
  })

  it('sanitizes invalid links and never sends removed scalar properties', () => {
    expect(getPriceRangeError('100', '99')).toBe('customer.serviceCatalog.invalidRange')
    expect(readServiceQuery(new URLSearchParams('page=-2&serviceType=99&sort=Code&minPrice=200&maxPrice=100'))).toEqual(initialServiceQuery)
    expect(writeServiceQuery(initialServiceQuery).toString()).toBe('')
    const filter = buildServiceFilter(initialServiceQuery)
    expect(filter).toMatchObject({ serviceTypes: [], priceRanges: [] })
    for (const key of ['serviceType', 'minPrice', 'maxPrice']) {
      expect(filter).not.toHaveProperty(key)
    }
  })
})
