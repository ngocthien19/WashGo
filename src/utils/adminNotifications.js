import { ADMIN_ROUTES } from './constants'

export function adminNotificationHref(item) {
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
    return `${ADMIN_ROUTES.ORDERS}/${item.linkId}`
  }
  return null
}
