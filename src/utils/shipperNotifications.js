import { SHIPPER_ROUTES } from './constants'
import { notificationTypesFor } from '~/components/notifications/notificationCatalog'

const types = notificationTypesFor('Shipper')
export function shipperNotificationHref(item) {
  if (types.includes(item.type) && item.linkType === 'order' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.linkId || '')) {
    return SHIPPER_ROUTES.TASK_DETAIL.replace(':orderId', item.linkId)
  }
  return null
}
