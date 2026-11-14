import { test, expect } from '@playwright/test'

test('React and the shared tooltip provider mount without hook errors after reload', async ({ page }) => {
  const failures = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && /Invalid hook call|useEffect|FloatingDelayGroup/.test(message.text())) {
      failures.push(message.text())
    }
  })
  await page.route('https://accounts.google.com/**', (route) => route.abort())
  await page.goto('/login')
  await expect(page.locator('form')).toBeVisible()
  await page.reload()
  await expect(page.locator('form')).toBeVisible()
  expect(failures).toEqual([])
})
