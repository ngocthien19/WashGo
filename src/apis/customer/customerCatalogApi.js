import authorizedAxios from '~/utils/http/authorizedAxios'
import { CUSTOMER_API_ENDPOINTS, CUSTOMER_CATALOG, LOCKER_AREA_PAGE_SIZE } from '~/utils/config/constants'
export { suggestionImages as catalogImages } from '~/utils/search/searchSuggestions'

const ensureSuccess = ({ data }) => {
  if (!data.succeeded) {
    throw new Error(data.message || 'customer.unableToLoadDataPleaseTryAgain')
  }
  return data
}

export const lockerSlots = (locker) => Array.isArray(locker?.slots)
  ? locker.slots : (locker?.availableSlots || []).map((slot) => ({ ...slot, status: 1 }))

export const customerCatalogApi = {
  // Catalog uses PaginatedResult (list/total), unlike the data envelope for details.
  getServices: (filter, signal) => authorizedAxios.post(CUSTOMER_API_ENDPOINTS.SERVICE_FILTER, filter, { signal })
    .then(ensureSuccess),
  getService: (id, signal) => authorizedAxios.get(`${CUSTOMER_API_ENDPOINTS.SERVICES}/${encodeURIComponent(id)}`, { signal })
    .then(ensureSuccess).then((response) => response.data),
  getLockers: (params, signal) => authorizedAxios.get(CUSTOMER_API_ENDPOINTS.LOCKERS, { params, signal })
    .then(ensureSuccess),
  getLocker: (id, signal) => authorizedAxios.get(`${CUSTOMER_API_ENDPOINTS.LOCKERS}/${encodeURIComponent(id)}`, { signal })
    .then(ensureSuccess).then((response) => response.data),
  getLockerAreas: async (signal) => {
    const areas = new Set()
    let page = CUSTOMER_CATALOG.INITIAL_PAGE
    let totalPages = page
    // Customer has no area/distinct endpoint. Read every page, not just the visible results.
    while (page <= totalPages) {
      const response = await customerCatalogApi.getLockers({ page, take: LOCKER_AREA_PAGE_SIZE }, signal)
      for (const locker of response.list || []) {
        if (locker.city) {
          areas.add(locker.city)
        }
      }
      totalPages = response.totalPages || 0
      page += 1
    }
    return [...areas].sort((a, b) => a.localeCompare(b, 'vi')).map((city) => ({ city }))
  }
}
