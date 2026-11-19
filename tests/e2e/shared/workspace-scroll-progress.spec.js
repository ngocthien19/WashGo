import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'

for (const role of ['Admin', 'Merchant', 'Shipper']) {
  test(`${role} header progress follows document scrolling in both themes and resets on navigation`, async ({ page }) => {
    const prefix = role.toLowerCase()
    await merchantSession(page, { role })
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      const data = path.endsWith('/auth/me')
        ? { id: 'merchant-test', fullName: 'Alex Store Owner', email: 'merchant@example.test', role }
        : path.endsWith('/notification/filter')
          ? { items: [], total: 0, page: 1, take: 10, unreadTotal: 0, counts: [] }
          : 0
      return route.fulfill({ json: { succeeded: true, data } })
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/${prefix}/notifications`)
    const track = page.locator('[data-workspace-scroll-progress]')
    await expect(track).toHaveCount(1)
    const fill = track.locator('div')
    const progress = () => fill.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).a)
    // Control the document height independently of API row counts; the header must
    // follow the document, not the separately scrollable sidebar or modal bodies.
    await page.locator('main').evaluate(element => {
      element.style.minHeight = '3000px'
    })
    const colors = []
    for (const dark of [false, true]) {
      await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark)
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
        await expect.poll(progress).toBeLessThan(0.01)
        await page.evaluate(() => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) / 2, behavior: 'instant' }))
        await expect.poll(progress).toBeGreaterThan(0.45)
        await expect.poll(progress).toBeLessThan(0.55)
        const header = await page.getByRole('banner').boundingBox()
        const bar = await track.boundingBox()
        expect(bar.y).toBeCloseTo(header.y, 0)
        expect(bar.height).toBe(4)
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
        await expect.poll(progress).toBeGreaterThan(0.99)
      }
      colors.push(await fill.evaluate(element => getComputedStyle(element).backgroundColor))
    }
    expect(colors[0]).not.toBe(colors[1])
    await page.getByRole('button', { name: 'Open account menu', exact: true }).click()
    await page.locator(`[role="menu"] a[href="/${prefix}/profile"]`).click()
    await expect(page).toHaveURL(`/${prefix}/profile`)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect.poll(progress).toBeLessThan(0.01)
  })
}
