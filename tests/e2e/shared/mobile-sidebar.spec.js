import { test, expect } from '@playwright/test'

const roles = [
  { role: 'Admin', start: '/admin/merchants', target: '/admin/orders', open: 'Open navigation', title: 'Admin navigation' },
  { role: 'Merchant', start: '/merchant/orders', target: '/merchant/services', open: 'Open Merchant navigation', title: 'Merchant navigation' },
  { role: 'Shipper', start: '/shipper/tasks', target: '/shipper/history', open: 'Open navigation', title: 'Shipper navigation' },
  { role: 'Customer', start: '/customer/services', target: '/customer/orders', open: 'Open navigation menu', title: 'Mobile navigation' }
]

for (const config of roles) {
  test(`${config.role} navigation slides from the left without shifting content and closes accessibly`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript((role) => {
      localStorage.setItem('persist:root', JSON.stringify({
        auth: JSON.stringify({ user: { id: 'sidebar-fixture', role, fullName: 'Sidebar fixture' }, accessToken: 'fixture-token', refreshToken: 'fixture-refresh', expiresAt: '2099-01-01T00:00:00Z' }),
        preferences: JSON.stringify({ language: 'en', serviceTermsSeen: { 'sidebar-fixture': true } }),
        theme: JSON.stringify({ mode: role === 'Merchant' ? 'dark' : 'light' }),
        _persist: JSON.stringify({ version: 1, rehydrated: true })
      }))
    }, config.role)
    await page.route('**/api/**', (route) => {
      const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
      if (path === '/auth/me') {
        return route.fulfill({ json: { succeeded: true, data: { id: 'sidebar-fixture', role: config.role, fullName: 'Sidebar fixture' } } })
      }
      if (path === '/policy/customer') {
        return route.fulfill({ json: { succeeded: true, data: { terms: { version: 'v1', content: 'Fixture terms' }, requiresAcceptance: false, rules: {} } } })
      }
      return route.fulfill({ status: 404, json: { succeeded: false, message: 'Fixture data is unavailable' } })
    })
    await page.goto(config.start)
    const trigger = page.getByRole('button', { name: config.open, exact: true })
    await expect(trigger).toBeVisible()
    const content = page.locator('main').first()
    const initialTop = (await content.boundingBox()).y
    await trigger.click()
    const drawer = page.getByRole('dialog', { name: config.title, exact: true })
    await expect(drawer).toBeVisible()
    await expect.poll(async () => Math.round((await drawer.boundingBox()).x)).toBe(0)
    const box = await drawer.boundingBox()
    expect(box.y).toBe(0)
    expect(box.width).toBeLessThan(390)
    expect(box.height).toBe(844)
    expect((await content.boundingBox()).y).toBe(initialTop)
    if (process.env.SIDEBAR_QA_SCREENSHOTS) {
      await page.screenshot({ path: `test-results/sidebar-${config.role.toLowerCase()}.png` })
    }
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()

    await trigger.click()
    await drawer.getByRole('button', { name: 'Close navigation menu', exact: true }).click()
    await expect(drawer).toBeHidden()

    await trigger.click()
    await expect(drawer).toBeVisible()
    await page.mouse.click(380, 400)
    await expect(drawer).toBeHidden()

    await trigger.click()
    await drawer.locator(`a[href="${config.target}"]`).click()
    await expect(page).toHaveURL(config.target)
    await expect(drawer).toBeHidden()

    await trigger.click()
    await expect(drawer).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeHidden()
    if (config.role !== 'Customer') {
      await expect(page.locator('aside')).toBeVisible()
      await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click()
      await expect(page.locator('aside')).toHaveCSS('width', '80px')
      await expect(content).toHaveCSS('margin-left', '80px')
      await expect(page.locator('header').first()).toHaveCSS('margin-left', '80px')
      const expandedWidth = config.role === 'Admin' ? '288px' : '256px'
      const expand = page.getByRole('button', { name: 'Expand navigation', exact: true })
      await expect(expand).toHaveAttribute('aria-expanded', 'false')
      await expand.click()
      await expect(page.locator('aside')).toHaveCSS('width', expandedWidth)
      await expect(content).toHaveCSS('margin-left', expandedWidth)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click()
      await expect(page.locator('aside')).toHaveCSS('width', '80px')
      await expect(page.locator('aside')).toHaveCSS('transition-property', 'none')
      await expand.click()
      await expect(content).toHaveCSS('margin-left', expandedWidth)
    }
  })
}
