import { expect, test } from '@playwright/test'
import { setupNotifications } from '../helpers/notificationSession'

test('admin inbox shares Customer formatting with Admin filters and synchronized bell actions', async ({ page }) => {
  const state = await setupNotifications(page, { role: 'Admin' })
  state.items[0] = { ...state.items[0], type: 40, group: 'feedback', title: 'New complaint received', content: 'Order #WG123. Reason: Damaged item.', messageArgs: { orderCode: 'WG123', reason: 'Damaged item' } }
  await page.goto('/admin/notifications')
  await expect(page.getByRole('heading', { name: 'New complaint received', exact: true })).toBeVisible({ timeout: 20000 })
  const nav = page.getByRole('navigation', { name: 'Filter notifications', exact: true })
  await expect(nav.getByRole('button', { name: 'All', exact: true })).toContainText('1')
  await page.getByRole('combobox', { name: 'Notification type' }).click()
  await page.getByRole('option', { name: 'New complaint', exact: true }).click()
  await expect(page).toHaveURL(/type=40/)
  await expect.poll(() => state.filters.at(-1)?.types).toEqual([40])
  await expect(page.locator('main strong').filter({ hasText: 'WG123' })).toBeVisible()
  await nav.getByRole('button', { name: 'Unread', exact: true }).click()
  await page.getByRole('button', { name: 'Mark as read', exact: true }).click()
  await expect(page.getByText('There are no notifications in this list.')).toBeVisible()
  await expect(nav.getByRole('button', { name: 'Unread', exact: true })).toContainText('0')
  await page.getByRole('button', { name: 'Notifications', exact: true }).click()
  const popup = page.getByRole('dialog')
  await expect(popup.getByRole('link', { name: 'All notifications', exact: true })).toHaveAttribute('href', '/admin/notifications')
  await expect(popup.getByRole('button', { name: 'View details', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  expect(state.writes).toHaveLength(1)
})
test('Admin filters and confirmed delete all fit a mobile dark inbox', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const state = await setupNotifications(page, { role: 'Admin', dark: true })
  await page.goto('/admin/notifications')
  await expect(page.getByRole('heading', { name: 'Your laundry is ready', exact: true })).toBeVisible({ timeout: 20000 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Delete all', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete all', exact: true }).click()
  await expect(page.getByText('There are no notifications in this list.')).toBeVisible()
  expect(state.writes).toEqual(['delete-all'])
})

test('Admin sees captured order events and deadline metadata without delivery health', async ({ page }) => {
  const state = await setupNotifications(page, { role: 'Admin' })
  state.items[0] = { ...state.items[0], type: 50, group: 'order', title: 'BE fallback', content: 'BE content', messageKey: 'orderEvent.MerchantAssigned', messageArgs: { orderCode: 'WG123' }, eventId: 'event-1', dueAt: '2026-11-17T02:00:00Z', detectedAt: '2026-11-17T02:05:00Z' }
  await page.goto('/admin/notifications?group=order')
  await expect(page.getByRole('heading', { name: 'Laundry shop assigned', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Notification delivery', exact: true })).toHaveCount(0)
  await expect(page.getByText('Due at', { exact: true })).toBeVisible()
  await expect(page.getByText('Overdue detected at', { exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(0)
  expect(state.filters.at(-1).types).toContain(50)
})

test('Admin legacy payment notice resolves its linked order code and removes hash prefixes in the bell', async ({ page }) => {
  const state = await setupNotifications(page, { role: 'Admin' })
  const id = '3a24f745-2e37-5d6f-1e10-b01dd461d257'
  state.items[0] = { ...state.items[0], type: 22, group: 'order', title: 'Payment needs verification', content: `Order ${id}: pending after 5 checks.`, linkType: 'order', linkId: id }
  await page.route(`**/api/wash-order/${id}`, route => route.fulfill({ json: { succeeded: true, data: { id, orderCode: 'WG2611168921' } } }))
  await page.goto('/admin/notifications')
  await expect(page.locator('main').getByText('Order WG2611168921: pending after 5 checks.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Notifications', exact: true }).click()
  const bell = page.getByRole('dialog')
  await expect(bell.getByText('Order WG2611168921: pending after 5 checks.', { exact: true })).toBeVisible()
  await expect(bell).not.toContainText(id)
  await expect(bell).not.toContainText('#WG')
  expect(state.writes).toHaveLength(0)
})

test('Admin new order notification shows a short locker and compartment description in the bell', async ({ page }) => {
  const state = await setupNotifications(page, { role: 'Admin' })
  const id = '3a24f745-2e37-5d6f-1e10-b01dd461d257'
  state.items[0] = { ...state.items[0], type: 1, group: 'order', title: 'Order created', content: 'Order WG2611172521 created.', linkType: 'order', linkId: id, messageKey: 'orderEvent.OrderCreated', messageArgs: { orderCode: 'WG2611172521' } }
  await page.route(`**/api/wash-order/${id}`, route => route.fulfill({ json: { succeeded: true, data: { id, orderCode: 'WG2611172521', lockerName: 'Ben Thanh Locker', boxNumber: 3 } } }))
  await page.goto('/admin/notifications')
  await expect(page.getByRole('heading', { name: 'New order', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Notifications', exact: true }).click()
  const bell = page.getByRole('dialog')
  await expect(bell.getByRole('heading', { name: 'New order', exact: true })).toBeVisible()
  await expect(bell).toContainText('Order WG2611172521 was created at Ben Thanh Locker, compartment 3. Awaiting customer drop-off.')
  await expect(bell).not.toContainText('#WG')
  expect(state.writes).toHaveLength(0)
})
