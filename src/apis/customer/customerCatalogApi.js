import authorizedAxios from '~/utils/authorizedAxios'
import { CUSTOMER_API_ENDPOINTS, CUSTOMER_CATALOG, LOCKER_AREA_PAGE_SIZE } from '~/utils/constants'

const ensureSuccess = ({ data }) => {
  if (!data.succeeded) {
    throw new Error(data.message || 'Không thể tải dữ liệu. Vui lòng thử lại.')
  }
  return data
}

export const customerCatalogApi = {
  // Catalog uses PaginatedResult (list/total), unlike the data envelope for details.
  getServices: (params, signal) => authorizedAxios.get(CUSTOMER_API_ENDPOINTS.SERVICES, { params, signal })
    .then(ensureSuccess),
  getService: (id, signal) => authorizedAxios.get(`${CUSTOMER_API_ENDPOINTS.SERVICES}/${encodeURIComponent(id)}`, { signal })
    .then(ensureSuccess).then((response) => response.data),
  getLockers: (params, signal) => authorizedAxios.get(CUSTOMER_API_ENDPOINTS.LOCKERS, { params, signal })
    .then(ensureSuccess),
  getLocker: (id, signal) => authorizedAxios.get(`${CUSTOMER_API_ENDPOINTS.LOCKERS}/${encodeURIComponent(id)}`, { signal })
    .then(ensureSuccess).then((response) => response.data),
  getLockerAreas: async (signal) => {
    const areas = new Map()
    let page = CUSTOMER_CATALOG.INITIAL_PAGE
    let totalPages = page
    // Customer has no area/distinct endpoint. Read every page, not just the visible results.
    while (page <= totalPages) {
      const response = await customerCatalogApi.getLockers({ page, take: LOCKER_AREA_PAGE_SIZE }, signal)
      for (const locker of response.list || []) {
        if (locker.city) {
          if (!areas.has(locker.city)) {
            areas.set(locker.city, new Set())
          }
          if (locker.district) {
            areas.get(locker.city).add(locker.district)
          }
        }
      }
      totalPages = response.totalPages || 0
      page += 1
    }
    return [...areas].sort(([a], [b]) => a.localeCompare(b, 'vi'))
      .map(([city, districts]) => ({ city, districts: [...districts].sort((a, b) => a.localeCompare(b, 'vi')) }))
  }
}
