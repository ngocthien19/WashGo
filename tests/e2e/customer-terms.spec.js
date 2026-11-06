import { expect, test } from '@playwright/test'

async function setup(page, dark = false) {
  const user = { id: 'terms-customer', fullName: 'Terms Customer', role: 'Customer' }
  await page.addInitScript(({ user, dark }) => {
    if (!localStorage.getItem('persist:root')) {
      localStorage.setItem('persist:root', JSON.stringify({
        auth: JSON.stringify({ user, accessToken: 'test', refreshToken: 'test', expiresAt: '2099-01-01T00:00:00Z' }),
        preferences: JSON.stringify({ language: 'en' }), theme: JSON.stringify({ mode: dark ? 'dark' : 'light' }),
        _persist: JSON.stringify({ version: 1, rehydrated: true })
      }))
    }
  }, { user, dark })
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    if (path === '/auth/me') {
      return route.fulfill({ json: { succeeded: true, data: user } })
    }
    if (path === '/auth/logout') {
      return route.fulfill({ json: { succeeded: true, data: true } })
    }
    if (path === '/auth/login') {
      return route.fulfill({ json: { succeeded: true, data: { user, accessToken: 'test', refreshToken: 'test', expiresAt: '2099-01-01T00:00:00Z' } } })
    }
    if (path === '/notification/unread-count') {
      return route.fulfill({ json: { succeeded: true, data: 0 } })
    }
    if (path === '/notification') {
      return route.fulfill({ json: { succeeded: true, list: [], total: 0, currentPage: 1, totalPages: 0 } })
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  await page.goto('/customer/notifications')
}

test('first session shows terms, a later visit skips them and footer reopens the same dialog', async ({ page }) => {
  await setup(page)
  const dialog = page.getByRole('dialog', { name: 'Terms of service', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: /Cancellation eligibility/ })).toBeVisible()
  await expect(dialog.getByText('No cancellation fee.', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'I understand', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'All notifications', exact: true }).first()).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Open account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('/login')
  await page.getByLabel('Email', { exact: true }).fill('terms@example.test')
  await page.getByLabel('Password', { exact: true }).fill('TestPassword123')
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/customer')
  await expect(page.getByRole('button', { name: 'Open account menu', exact: true })).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await page.locator('footer').getByRole('button', { name: 'Terms of service', exact: true }).click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  const seen = await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('persist:root')).preferences).serviceTermsSeen)
  expect(seen).toEqual({ 'terms-customer': true })
})

test('mobile dark terms keep controls reachable and footer can reopen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await setup(page, true)
  const dialog = page.getByRole('dialog', { name: 'Terms of service', exact: true })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('heading', { name: /Incident reports/ }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('button', { name: 'I understand' })).toBeInViewport()
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await dialog.getByRole('button', { name: 'I understand' }).click()
  await page.locator('footer').getByRole('button', { name: 'Terms', exact: true }).click()
  await expect(dialog).toBeVisible()
})
