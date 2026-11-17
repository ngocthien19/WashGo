import { expect, test } from '@playwright/test'
import { setupNotifications, notificationId } from '../helpers/notificationSession'

for (const role of ['Customer', 'Admin', 'Merchant', 'Shipper']) {
  test(`${role} bell loads older notifications on scroll and preserves loaded pages after marking read`, async ({ page }) => {
    const state = await setupNotifications(page, { role, dark: role === 'Merchant' })
    state.items = Array.from({ length: 25 }, (_, index) => ({ id: index ? `notification-${index}` : notificationId, title: `Notice ${String(index + 1).padStart(2, '0')}`, content: 'Account activity update.', isRead: index > 0, createdOn: 1793923200 - index }))
    const requests = []
    await page.route('**/api/notification?*', route => {
      requests.push(Number(new URL(route.request().url()).searchParams.get('page')))
      return route.fallback()
    })
    await page.goto(role === 'Customer' ? '/notifications' : `/${role.toLowerCase()}/notifications`)
    await page.getByRole('button', { name: 'Notifications', exact: true }).click()
    const popup = page.getByRole('dialog')
    await expect(popup.getByRole('heading', { name: /^Notice/ })).toHaveCount(10)
    const scroller = popup.locator('.overflow-y-auto').first()
    await scroller.evaluate(el => {
      el.scrollTop = el.scrollHeight
    })
    await expect(popup.getByRole('heading', { name: /^Notice/ })).toHaveCount(20)
    await scroller.evaluate(el => {
      el.scrollTop = el.scrollHeight
    })
    await expect(popup.getByRole('heading', { name: /^Notice/ })).toHaveCount(25)
    await expect(popup.getByRole('button', { name: 'Load more notifications', exact: true })).toHaveCount(0)
    expect(requests).toEqual([1, 2, 3])
    await scroller.evaluate(el => {
      el.scrollTop = 0
    })
    await popup.getByRole('button', { name: 'Mark as read', exact: true }).click()
    await expect.poll(() => requests.slice(-3)).toEqual([1, 2, 3])
    await expect(popup.getByRole('heading', { name: /^Notice/ })).toHaveCount(25)
    await expect(popup.getByRole('button', { name: 'Mark as read', exact: true })).toHaveCount(0)
  })
}

test('bell keeps old notifications visible when the next page fails and retries only that page', async ({ page }) => {
  const state = await setupNotifications(page)
  state.items = Array.from({ length: 15 }, (_, index) => ({ id: `notice-${index}`, title: `Notice ${index + 1}`, content: 'Activity update.', isRead: true, createdOn: 1793923200 - index }))
  let fail = true
  await page.route('**/api/notification?*', route => {
    if (new URL(route.request().url()).searchParams.get('page') === '2' && fail) {
      fail = false
      return route.fulfill({ status: 500, json: { succeeded: false } })
    }
    return route.fallback()
  })
  await page.goto('/notifications')
  await page.getByRole('button', { name: 'Notifications', exact: true }).click()
  const popup = page.getByRole('dialog')
  await expect(popup.getByRole('heading', { name: /^Notice/ })).toHaveCount(10)
  await popup.locator('.overflow-y-auto').first().evaluate(el => {
    el.scrollTop = el.scrollHeight
  })
  await expect(popup.getByRole('alert')).toBeVisible()
  await expect(popup.getByRole('heading', { name: /^Notice/ })).toHaveCount(10)
  await popup.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(popup.getByRole('heading', { name: /^Notice/ })).toHaveCount(15)
  await expect(popup.getByRole('alert')).toHaveCount(0)
})
