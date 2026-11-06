import { CUSTOMER_ROUTES } from '~/utils/constants'

export function notificationHref(item) {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.linkId || '')) {
    return null
  }
  if (item.linkType === 'order') {
    return CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', item.linkId)
  }
  if (item.linkType === 'incident') {
    return CUSTOMER_ROUTES.COMPLAINT_DETAIL.replace(':incidentId', item.linkId)
  }
  return null
}
