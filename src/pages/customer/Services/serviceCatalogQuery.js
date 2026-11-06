import { CUSTOMER_CATALOG, SERVICE_PRICE_RANGES, SERVICE_SORT_OPTIONS, SERVICE_TYPES } from '~/utils/constants'

export const initialServiceQuery = {
  keyword: '', serviceTypes: [], priceRanges: [], minPrice: '', maxPrice: '', sort: SERVICE_SORT_OPTIONS[0].value,
  page: CUSTOMER_CATALOG.INITIAL_PAGE
}

const parsePrice = (value) => {
  const text = String(value ?? '').trim()
  if (!text) {
    return undefined
  }
  const amount = Number(text)
  return /^(?:\d+\.?\d*|\.\d+)$/.test(text) && Number.isFinite(amount) && amount <= Number.MAX_SAFE_INTEGER ? amount : NaN
}

export const getPriceRangeError = (minPrice, maxPrice) => {
  const min = parsePrice(minPrice)
  const max = parsePrice(maxPrice)
  if (Number.isNaN(min) || Number.isNaN(max)) {
    return 'customer.serviceCatalog.invalidPrice'
  }
  return min !== undefined && max !== undefined && min > max ? 'customer.serviceCatalog.invalidRange' : ''
}

export const readServiceQuery = (params) => {
  const page = Number(params.get('page'))
  const serviceTypes = [...new Set(params.getAll('serviceType'))].filter((value) => value && SERVICE_TYPES.some((type) => type.value === value))
  const priceRanges = [...new Set(params.getAll('priceRange'))].filter((value) => value && SERVICE_PRICE_RANGES.some((range) => range.value === value))
  const sort = params.get('sort') || ''
  const minPrice = params.get('minPrice')?.trim() || ''
  const maxPrice = params.get('maxPrice')?.trim() || ''
  const invalidRange = getPriceRangeError(minPrice, maxPrice)
  const legacyPreset = !invalidRange && (minPrice || maxPrice)
    ? SERVICE_PRICE_RANGES.find((range) => range.value && range.minPrice === minPrice && range.maxPrice === maxPrice) : null
  if (legacyPreset && !priceRanges.includes(legacyPreset.value)) {
    priceRanges.push(legacyPreset.value)
  }
  return {
    keyword: params.get('keyword')?.trim() || '',
    serviceTypes,
    priceRanges,
    sort: SERVICE_SORT_OPTIONS.some((option) => option.value === sort) ? sort : initialServiceQuery.sort,
    minPrice: invalidRange || legacyPreset ? '' : minPrice,
    maxPrice: invalidRange || legacyPreset ? '' : maxPrice,
    page: Number.isSafeInteger(page) && page >= CUSTOMER_CATALOG.INITIAL_PAGE ? page : CUSTOMER_CATALOG.INITIAL_PAGE
  }
}

export const writeServiceQuery = (query) => {
  const params = new URLSearchParams()
  for (const key of ['keyword', 'minPrice', 'maxPrice']) {
    if (query[key]) {
      params.set(key, query[key])
    }
  }
  query.serviceTypes.forEach((value) => params.append('serviceType', value))
  query.priceRanges.forEach((value) => params.append('priceRange', value))
  if (query.sort !== initialServiceQuery.sort) {
    params.set('sort', query.sort)
  }
  if (query.page > CUSTOMER_CATALOG.INITIAL_PAGE) {
    params.set('page', String(query.page))
  }
  return params
}

export const buildServiceFilter = (query) => ({
  page: query.page,
  take: CUSTOMER_CATALOG.PAGE_SIZE,
  keyword: query.keyword || undefined,
  serviceTypes: query.serviceTypes.map(Number),
  priceRanges: [
    ...query.priceRanges.map((value) => SERVICE_PRICE_RANGES.find((range) => range.value === value)),
    ...(query.minPrice || query.maxPrice ? [query] : [])
  ].map((range) => ({ minPrice: parsePrice(range.minPrice), maxPrice: parsePrice(range.maxPrice) })),
  sortBy: (SERVICE_SORT_OPTIONS.find((option) => option.value === query.sort) || SERVICE_SORT_OPTIONS[0]).sortBy
})
