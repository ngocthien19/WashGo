import { expect, it } from 'vitest'
import { notificationFilters } from '~/components/notifications/notificationModel'
import { merchantNotificationHref, MERCHANT_NOTIFICATION_TYPES } from './notificationModel'

const id = '11111111-1111-4111-8111-111111111111'

it('accepts Merchant types without changing Customer type filters', () => {
  for (const type of MERCHANT_NOTIFICATION_TYPES) {
    expect(notificationFilters(new URLSearchParams({ type }), MERCHANT_NOTIFICATION_TYPES).types).toEqual([type])
  }
  expect(notificationFilters(new URLSearchParams('type=24')).types).toBeUndefined()
  expect(notificationFilters(new URLSearchParams('type=30'), MERCHANT_NOTIFICATION_TYPES).types).toBeUndefined()
  expect(notificationFilters(new URLSearchParams({ keyword: 'x'.repeat(150) })).keyword).toHaveLength(100)
})

it('opens Merchant destinations and rejects unsafe or unsupported links', () => {
  expect(merchantNotificationHref({ linkType: 'order', linkId: id })).toBe(`/merchant/orders/${id}`)
  expect(merchantNotificationHref({ linkType: 'service', linkId: id })).toBe(`/merchant/services?tab=proposals&serviceId=${id}`)
  expect(merchantNotificationHref({ linkType: 'service-proposal', linkId: id })).toBe('/merchant/services?tab=proposals')
  expect(merchantNotificationHref({ linkType: 'merchant-profile-request', linkId: id })).toBe('/merchant/profile')
  expect(merchantNotificationHref({ linkType: 'merchant', linkId: id })).toBe('/merchant/profile')
  for (const item of [{ linkType: 'order', linkId: '../profile' }, { linkType: 'incident', linkId: id }, { linkType: 'https://example.com', linkId: id }, {}]) {
    expect(merchantNotificationHref(item)).toBeNull()
  }
})
