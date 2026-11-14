import { expect, it } from 'vitest'
import { shipperNotificationHref } from './shipperNotifications'
it('routes published task notifications only to the shipper task page', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  expect(shipperNotificationHref({ type: 30, linkType: 'order', linkId: id })).toBe(`/shipper/tasks/${id}`)
  expect(shipperNotificationHref({ type: 30, linkType: 'order', linkId: '../admin' })).toBe(null)
  expect(shipperNotificationHref({ type: 46, linkType: 'order', linkId: id })).toBe(null)
  expect(shipperNotificationHref({ type: 30, linkType: 'incident', linkId: id })).toBe(null)
})
