import { MERCHANT_ROUTES } from '~/utils/constants'
import { notificationTypesFor } from '~/components/notifications/notificationCatalog'

// Types currently published to Merchant accounts by the backend.
export const MERCHANT_NOTIFICATION_TYPES = notificationTypesFor('Merchant')

export function merchantNotificationHref(item) {
  if ([24, 25].includes(item.type)) {
    return MERCHANT_ROUTES.REPORTS
  }
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.linkId || '')) {
    return null
  }
  switch (item.linkType) {
  case 'order':
    return MERCHANT_ROUTES.ORDER_DETAIL.replace(':orderId', item.linkId)
  case 'merchant':
  case 'merchant-profile-request':
    return MERCHANT_ROUTES.PROFILE
  case 'service':
    return `${MERCHANT_ROUTES.SERVICES}?tab=proposals&serviceId=${item.linkId}`
  case 'service-proposal':
    return `${MERCHANT_ROUTES.SERVICES}?tab=proposals`
  default:
    return null
  }
}
