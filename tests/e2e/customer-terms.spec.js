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
  const state = { accepted: false, version: 'v1', writes: [] }
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    if (path === '/policy/customer' || path === '/policy/customer/acknowledge') {
      if (route.request().method() === 'POST') {
        state.writes.push(route.request().postDataJSON())
        state.accepted = true
      }
      return route.fulfill({ json: { succeeded: true, data: { terms: { version: state.version, title: 'Terms of service', content: 'Server policy content', effectiveFrom: '2026-11-01T00:00:00Z' }, rules: { depositWindowMinutes: 45 }, accepted: state.accepted, requiresAcceptance: !state.accepted, acceptedVersion: state.accepted ? state.version : null } } })
    }
    if (path === '/notification/filter') {
      return route.fulfill({ json: { succeeded: true, data: { items: [], total: 0, page: 1, take: 12, unreadTotal: 0, counts: [] } } })
    }
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
  return state
}

test('server acceptance survives reload; closing does not accept and a new version opens again', async ({ page }) => {
  const state = await setup(page)
  const dialog = page.getByRole('dialog', { name: 'Terms of service', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Server policy content')).toBeVisible()
  await page.keyboard.press('Escape')
  expect(state.writes).toEqual([])
  await page.reload()
  await expect(dialog).toBeVisible()
  const agree = dialog.getByRole('button', { name: 'I agree to the terms' })
  await expect(agree).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await expect(agree).toBeEnabled()
  await agree.click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toEqual([{ version: 'v1' }])
  await page.reload()
  await expect(page.getByRole('heading', { name: 'All notifications', exact: true }).first()).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await page.locator('footer').getByRole('button', { name: 'Terms of service', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'I agree to the terms' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  state.version = 'v2'; state.accepted = false
  await page.reload()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Version v2')).toHaveCount(0)
  await expect(dialog.getByRole('checkbox')).not.toBeChecked()
  await expect(dialog.getByRole('button', { name: 'I agree to the terms' })).toBeDisabled()
})
test('mobile dark terms show server policy without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await setup(page, true)
  const dialog = page.getByRole('dialog', { name: 'Terms of service', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'I agree to the terms' })).toBeInViewport()
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
})
