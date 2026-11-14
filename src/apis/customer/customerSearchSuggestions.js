import { catalogImages, customerCatalogApi } from './customerCatalogApi'
import { customerOrderApi } from './customerOrderApi'
import { customerIncidentApi } from './customerIncidentApi'
import { formatCurrency, formatLockerAddress } from '~/utils/formats'
import { SEARCH_SUGGESTIONS } from '~/utils/constants'
import { notificationApi } from '~/apis/notificationApi'
import { loadSuggestionPages } from '~/utils/searchSuggestions'

export const customerSuggestionLoader = (type, filter = {}) => async (keyword, signal) => {
  const load = {
    service: customerCatalogApi.getServices,
    locker: customerCatalogApi.getLockers,
    order: customerOrderApi.list,
    incident: customerIncidentApi.filter,
    notification: notificationApi.filter
  }[type]
  if (!load) {
    return []
  }
  const results = await loadSuggestionPages(load, { ...filter, take: SEARCH_SUGGESTIONS.PAGE_SIZE }, keyword, signal)
  return [...new Map(results.map((item) => [item.id, item])).values()].filter((item) => item.id && (item.name || item.orderCode || item.title)).map((item) => ({
    id: item.id,
    label: type === 'notification' ? item.title : type === 'service' || type === 'locker' ? item.name : item.orderCode,
    description: type === 'locker' ? formatLockerAddress(item) : type === 'notification' ? item.content : undefined,
    code: type === 'service' || type === 'locker' ? item.code : undefined,
    price: type === 'service' ? `${formatCurrency(item.unitPrice)} / ${item.unit || '—'}` : undefined,
    images: type === 'service' || type === 'locker' ? catalogImages(item) : undefined
  }))
}
