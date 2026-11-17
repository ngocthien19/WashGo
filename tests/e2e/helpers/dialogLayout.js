import { expect } from '@playwright/test'

export async function expectFixedDialog(dialog) {
  const header = dialog.locator('[data-dialog-header]').first()
  await expect(header).toBeVisible()
  const footer = dialog.locator('[data-dialog-footer]').last()
  const beforeHeader = await header.boundingBox()
  const beforeFooter = await footer.count() ? await footer.boundingBox() : null
  const bodies = dialog.locator('[data-dialog-body]')
  let scrolled = false
  for (const body of await bodies.all()) {
    if (!await body.isVisible()) {
      continue
    }
    scrolled ||= await body.evaluate(el => {
      el.scrollTop = el.scrollHeight; return el.scrollTop > 0
    })
  }
  expect(scrolled).toBe(true)
  expect((await header.boundingBox()).y).toBeCloseTo(beforeHeader.y, 0)
  if (beforeFooter) {
    expect((await footer.boundingBox()).y).toBeCloseTo(beforeFooter.y, 0)
  }
}
