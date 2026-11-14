import { expect, it } from 'vitest'
import { NOTIFICATION_CATEGORIES, notificationTypesFor } from './notificationCatalog'
import { notificationFilters } from './notificationModel'
import { adminNotificationHref } from '~/utils/notifications/adminNotifications'
import { merchantNotificationHref } from '~/pages/merchant/Notifications/notificationModel'
const id = '11111111-1111-4111-8111-111111111111'

it('only shows categories with actually published events and no empty promotion navigation', () => {
  for (const [role, categories] of Object.entries(NOTIFICATION_CATEGORIES)) {
    expect(categories.every(item => item.types.length > 0 && item.id !== 'promotion')).toBe(true)
    expect(new Set(categories.flatMap(item => item.types)).size).toBe(notificationTypesFor(role).length)
  }
  expect(notificationTypesFor('Shipper')).toEqual([10, 30, 31, 32, 33, 34])
  expect(notificationTypesFor('Customer')).not.toContain(41)
  expect(notificationTypesFor('Merchant')).not.toContain(42)
})
it('Admin service and Merchant profile navigation filters types without sending invented BE groups', () => {
  const types = notificationTypesFor('Admin'), categories = NOTIFICATION_CATEGORIES.Admin
  expect(notificationFilters(new URLSearchParams('group=services'), types, categories)).toMatchObject({ groups: undefined, types: [46] })
  expect(notificationFilters(new URLSearchParams('group=merchant'), types, categories)).toMatchObject({ groups: undefined, types: [47] })
  expect(notificationFilters(new URLSearchParams('group=order'), types, categories)).toMatchObject({ groups: undefined, types: [22, 23, 43, 44, 45] })
})
it('a stale type from another category cannot accidentally empty the new navigation', () => {
  const filters = notificationFilters(new URLSearchParams('group=refunds&type=46'), notificationTypesFor('Admin'), NOTIFICATION_CATEGORIES.Admin)
  expect(filters).toMatchObject({ groups: ['payment'], types: [41] })
})
it('Admin refund and summary links open existing Admin pages while unsafe links fail closed', () => {
  expect(adminNotificationHref({ type: 41, linkType: 'order', linkId: id })).toBe(`/admin/finance?tab=refunds&orderId=${id}`)
  expect(adminNotificationHref({ type: 45 })).toBe('/admin/orders')
  expect(adminNotificationHref({ type: 40, linkType: 'incident', linkId: id })).toBe(`/admin/complaints/${id}`)
  expect(adminNotificationHref({ type: 46, linkType: 'service-proposal', linkId: id })).toBe(`/admin/services?tab=proposals&proposal=${id}`)
  expect(adminNotificationHref({ type: 41, linkType: 'order', linkId: '../profile' })).toBeNull()
  expect(adminNotificationHref({ type: 42, linkType: 'rating', linkId: id })).toBeNull()
})
it('Merchant settlement with no link ID still opens the related report without guessing a settlement', () => {
  expect(merchantNotificationHref({ type: 24 })).toBe('/merchant/reports')
  expect(merchantNotificationHref({ type: 25 })).toBe('/merchant/reports')
})
