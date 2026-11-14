import { ADMIN_ROUTES } from '../config/constants'

export function adminNotificationHref(item) {
  if (item.type === 45 && !item.linkId) {
    return ADMIN_ROUTES.ORDERS
  }
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.linkId || '')) {
    return null
  }
  if (item.linkType === 'merchant-profile-request') {
    return `${ADMIN_ROUTES.MERCHANTS}?tab=requests&request=${item.linkId}`
  }
  if (item.linkType === 'merchant') {
    return `${ADMIN_ROUTES.MERCHANTS}?merchant=${item.linkId}`
  }
  if (item.linkType === 'order') {
    if (item.type === 41) {
      return `${ADMIN_ROUTES.FINANCE}?tab=refunds&orderId=${item.linkId}`
    }
    return `${ADMIN_ROUTES.ORDERS}/${item.linkId}`
  }
  if (item.linkType === 'incident') {
    return `${ADMIN_ROUTES.COMPLAINTS}/${item.linkId}`
  }
  if (item.linkType === 'service-proposal') {
    return `${ADMIN_ROUTES.SERVICES}?tab=proposals&proposal=${item.linkId}`
  }
  if (item.linkType === 'service') {
    return `${ADMIN_ROUTES.SERVICES}?service=${item.linkId}`
  }
  return null
}
