import { MERCHANT_ROUTES } from '~/utils/constants'

// Types currently published to Merchant accounts by the backend.
export const MERCHANT_NOTIFICATION_TYPES = [6, 9, 10, 11, 12, 20, 21, 22, 23, 24, 25, 26, 27, 29, 32, 43]

export function merchantNotificationHref(item) {
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
