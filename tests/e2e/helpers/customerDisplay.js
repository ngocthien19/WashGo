import { expect } from '@playwright/test'

// Mobile display preferences live inside the navigation drawer.
export async function chooseMobileDisplay(page, { dark = false, vietnamese = false } = {}) {
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
  const drawer = page.locator('#customer-mobile-navigation')
  await expect(drawer).toBeVisible()
  if (dark) {
    await drawer.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
  }
  if (vietnamese) {
    await drawer.getByRole('button', { name: 'Change language', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  }
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
}
