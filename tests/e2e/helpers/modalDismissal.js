import { expect } from '@playwright/test'

export async function expectQuietDismissal(page, open) {
  for (const closeWith of ['button', 'x']) {
    await open()
    const dialog = page.getByRole('dialog').last()
    await expect(dialog).toBeVisible()
    const reads = []
    const capture = request => {
      if (request.url().includes('/api/') && request.method() !== 'OPTIONS') {
        reads.push(request.url())
      }
    }
    page.on('request', capture)
    const name = closeWith === 'button' ? /^Close$/ : /^Close(?: service details)?$/
    const button = dialog.getByRole('button', { name })
    await (closeWith === 'button' ? button.last() : button.first()).click()
    await expect(dialog).toHaveCount(0)
    // Allow effects and deferred resource reloads to run before asserting no reads.
    await page.waitForTimeout(350)
    page.off('request', capture)
    expect(reads).toEqual([])
  }
}
