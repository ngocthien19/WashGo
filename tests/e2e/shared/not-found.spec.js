import { expect, test } from '@playwright/test'

test('unknown URLs show 404 without role requests and Home remains reachable', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('persist:root', JSON.stringify({ preferences: JSON.stringify({ language: 'en' }), _persist: JSON.stringify({ version: 1, rehydrated: true }) })))
  const apiRequests = []
  await page.route('**/api/**', route => {
    apiRequests.push(route.request().url())
    return route.fulfill({ status: 503, json: { succeeded: false } })
  })
  for (const path of ['/missing-page', '/admin/missing-page', '/merchant/missing-page', '/shipper/missing-page']) {
    await page.goto(path)
    await expect(page).toHaveURL(path)
    await expect(page.getByRole('heading', { name: 'Page not found', exact: true })).toBeVisible()
    await expect(page).toHaveTitle('Page not found | WashGo')
  }
  expect(apiRequests).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.not-found-raindrop').first()).toHaveCSS('animation-name', 'none')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('header').getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
})
