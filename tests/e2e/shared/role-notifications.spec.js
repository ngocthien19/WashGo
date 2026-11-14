import { expect, test } from '@playwright/test'
import { setupNotifications, notificationId, orderId } from '../helpers/notificationSession'

for (const [role, type] of [['Admin', 43], ['Merchant', 24], ['Shipper', 30]]) {
  test(`${role} notification suggestions share matching fields and filtered result counts`, async ({ page }) => {
    const state = await setupNotifications(page, { role })
    state.items[0] = { ...state.items[0], type, title: 'Task update', content: 'Information from Central Laundry.', isRead: true }
    await page.goto(`/${role.toLowerCase()}/notifications`)
    await expect(page.getByRole('status')).toContainText('1 notification found')
    const input = page.getByRole('search').getByRole('combobox')
    await input.fill('CENTRAL')
    const option = page.getByRole('option').filter({ hasText: 'Task update' })
    await expect(option).toBeVisible()
    await expect(option.getByText('Information from Central Laundry.', { exact: true })).toHaveCSS('font-weight', '700')
    await option.click()
    await expect(page).toHaveURL(/keyword=Task\+update/)
    await expect(page.getByRole('status')).toContainText('1 notification found')
    expect(state.writes).toHaveLength(0)
  })
}

test('Admin navigation covers real event domains and sends supported server filters', async ({ page }) => {
  const state = await setupNotifications(page, { role: 'Admin' })
  state.items = [43, 40, 41, 42, 46, 47, 45].map((type, index) => ({ ...state.items[0], id: index ? `notification-${type}` : notificationId, type, group: [40, 42].includes(type) ? 'feedback' : type === 41 ? 'payment' : type >= 45 ? 'system' : 'order', title: `Admin event ${type}`, isRead: true }))
  await page.goto('/admin/notifications')
  const nav = page.getByRole('navigation', { name: 'Filter notifications', exact: true })
  await expect(nav.getByRole('button', { name: /^All/ })).toContainText('7')
  await expect(nav.getByRole('button', { name: 'Services', exact: true })).toContainText('1')
  await expect(nav.getByRole('button', { name: 'Orders & operations', exact: true })).toContainText('2')
  const orderNav = nav.getByRole('button', { name: 'Orders & operations', exact: true })
  const bounds = await orderNav.evaluate(button => {
    const badge = button.lastElementChild.getBoundingClientRect(), parent = button.getBoundingClientRect()
    return { badgeRight: badge.right, parentRight: parent.right }
  })
  expect(bounds.badgeRight).toBeLessThanOrEqual(bounds.parentRight)
  await expect(page.getByText('Search notifications', { exact: true })).toBeVisible()
  await expect(page.getByText('Notification type', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Notifications', exact: true })).toHaveCount(0)
  await expect(nav.getByRole('button', { name: /Promotion|System/ })).toHaveCount(0)
  for (const [name, types, visible] of [['Services', [46], 46], ['Merchant profile', [47], 47], ['Refunds', [41], 41], ['Ratings', [42], 42], ['Complaints', [17, 40], 40], ['Orders & operations', [22, 23, 43, 44, 45], 45]]) {
    await nav.getByRole('button', { name, exact: true }).click()
    await expect(page.getByRole('heading', { name: `Admin event ${visible}`, exact: true })).toBeVisible()
    await expect.poll(() => state.filters.at(-1)?.types).toEqual(types)
    expect(state.filters.at(-1)?.groups || []).not.toContain(name)
  }
  await page.reload()
  await expect(nav.getByRole('button', { name: 'Orders & operations', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('Admin bell opens the Admin inbox and refund details lead to Finance for the correct order', async ({ page }) => {
  const state = await setupNotifications(page, { role: 'Admin' })
  state.items[0] = { ...state.items[0], type: 41, group: 'payment', title: 'Refund review' }
  await page.goto('/admin/notifications')
  await page.getByRole('button', { name: 'Notifications', exact: true }).click()
  const popover = page.getByRole('dialog')
  await expect(popover.getByRole('link', { name: 'All notifications', exact: true })).toHaveAttribute('href', '/admin/notifications')
  await popover.getByRole('button', { name: 'View details', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/finance\\?tab=refunds&orderId=${orderId}`))
  expect(state.writes).toEqual([`/notification/${notificationId}/read`])
})

test('failure to mark read does not block navigation to the permitted Admin target', async ({ page }) => {
  await setupNotifications(page, { role: 'Admin' })
  await page.route(`**/api/notification/${notificationId}/read`, route => route.fulfill({ status: 500, json: { succeeded: false } }))
  await page.goto('/admin/notifications')
  await page.getByRole('button', { name: 'View details', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${orderId}`))
})

test('Shipper shares inbox actions and routes real order notifications to scoped task details', async ({ page }) => {
  const state = await setupNotifications(page, { role: 'Shipper', dark: true })
  state.items[0] = { ...state.items[0], type: 30, group: 'order', title: 'New delivery task' }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/shipper/notifications')
  const nav = page.getByRole('navigation', { name: 'Filter notifications', exact: true })
  await nav.getByRole('button', { name: 'Delivery tasks', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'New delivery task', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View details', exact: true })).toBeVisible()
  await expect.poll(() => state.filters.at(-1)?.types).toEqual([10, 30, 31, 32, 33, 34])
  await page.getByRole('button', { name: 'Mark as read', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Mark as read', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Notifications', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('link', { name: 'All notifications', exact: true })).toHaveAttribute('href', '/shipper/notifications')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.keyboard.press('Escape')
  await page.locator('main').getByRole('button', { name: 'View details', exact: true }).click()
  await expect(page).toHaveURL(`/shipper/tasks/${orderId}`)
})

test('Customer has only published navigation groups and Merchant retains service/profile categories', async ({ page }) => {
  await setupNotifications(page)
  await page.goto('/notifications')
  const nav = page.getByRole('navigation', { name: 'Filter notifications', exact: true })
  await expect(nav.getByRole('button', { name: 'Complaints', exact: true })).toBeVisible()
  await expect(nav.getByRole('button', { name: /Promotion|System|Services|Merchant profile/ })).toHaveCount(0)
})
