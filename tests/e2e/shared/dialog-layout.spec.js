import { test, expect } from '@playwright/test'
import { setupAdminMerchants } from '../helpers/adminMerchantSession'

for (const dark of [false, true]) {
  for (const width of [375, 1280]) {
    test(`merchant lock has one scroll body and pinned controls (${width}, dark=${dark})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 620 })
      const state = await setupAdminMerchants(page, { dark })
      await page.goto('/admin/merchants')
      await page.getByRole('button', { name: 'Actions for Ben Thanh Laundry', exact: true }).click()
      await page.getByRole('menuitem', { name: 'Lock account', exact: true }).click()
      const dialog = page.getByRole('dialog')
      const header = dialog.locator('[data-dialog-header]')
      const footer = dialog.locator('[data-dialog-footer]')
      const body = dialog.locator('[data-dialog-body]')
      await expect(body).toHaveCount(1)
      await expect(header).toBeVisible()
      await expect(footer).toBeVisible()
      await expect(dialog).toHaveCSS('opacity', '1')
      const initial = { header: await header.boundingBox(), footer: await footer.boundingBox() }
      await body.evaluate(el => {
        el.scrollTop = el.scrollHeight
      })
      expect(await body.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
      expect((await header.boundingBox()).y).toBeCloseTo(initial.header.y, 0)
      expect((await footer.boundingBox()).y).toBeCloseTo(initial.footer.y, 0)
      const scrollAreas = await dialog.evaluate(el => [...el.querySelectorAll('*')].filter(node => {
        const style = getComputedStyle(node)
        return /auto|scroll/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1
      }).length)
      expect(scrollAreas).toBe(1)
      await dialog.getByRole('textbox').fill('Operational review')
      await dialog.getByRole('checkbox').check()
      await expect(dialog.getByRole('button', { name: 'Confirm update', exact: true })).toBeEnabled()
      const surface = await header.evaluate(el => getComputedStyle(el).backgroundImage)
      expect(surface).toContain('linear-gradient')
      await footer.getByRole('button', { name: 'Close', exact: true }).click()
      await page.goto('/admin/merchants?tab=requests')
      await page.getByRole('button', { name: 'Actions for Ben Thanh Laundry', exact: true }).click()
      await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Reject', exact: true }).click()
      const danger = page.getByRole('dialog').locator('[data-dialog-header]')
      await expect(danger).toHaveAttribute('data-tone', 'danger')
      expect(await danger.evaluate(el => getComputedStyle(el).backgroundImage)).toBe(surface)
      const accent = await danger.evaluate(el => {
        const sample = document.createElement('span')
        sample.style.backgroundColor = 'var(--color-red-400)'
        el.append(sample)
        const result = { actual: getComputedStyle(el, '::before').backgroundColor, expected: getComputedStyle(sample).backgroundColor }
        sample.remove()
        return result
      })
      expect(accent.actual).toBe(accent.expected)
      expect(state.writes).toHaveLength(0)
    })
  }
}
