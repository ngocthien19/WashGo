import { expect, test } from '@playwright/test'
import { setupNotifications } from '../helpers/notificationSession'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMC/wCfyO0AAAAASUVORK5CYII=', 'base64')
async function setup(page, { empty = false, longText = false } = {}) {
  await setupNotifications(page, { dark: true })
  const state = { fail: false, queries: [], summaryReads: 0, imageAuth: [] }
  const rows = Array.from({ length: 8 }, (_, index) => {
    const id = `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`
    return { id, overallStars: index % 2 ? 4 : 5, comment: `Careful laundry ${index + 1}${longText ? ' Clean clothes and helpful service.'.repeat(40) : ''}`, publishedAt: '2026-11-14T01:00:00Z', imageUrls: index === 0 ? [`/customer/reviews/${id}/images/0`] : [], customerName: 'Never expose this name', orderCode: 'Never expose this order' }
  })
  await page.route('**/api/customer/services/filter', route => route.fulfill({ json: { succeeded: true, list: [], total: 0, currentPage: 1, totalPages: 0 } }))
  await page.route('**/api/customer/reviews**', route => {
    const url = new URL(route.request().url())
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    if (url.pathname.endsWith('/summary')) {
      state.summaryReads++
      return ok({ total: empty ? 0 : 8, averageStars: empty ? null : 4.5, distribution: [1, 2, 3, 4, 5].map(stars => ({ stars, count: !empty && stars >= 4 ? 4 : 0, rate: !empty && stars >= 4 ? 50 : 0 })) })
    }
    if (url.pathname.includes('/images/')) {
      state.imageAuth.push(route.request().headers().authorization)
      return route.fulfill({ contentType: 'image/png', body: png })
    }
    const pageNumber = Number(url.searchParams.get('page')), take = Number(url.searchParams.get('take')), stars = Number(url.searchParams.get('stars'))
    state.queries.push({ page: pageNumber, take, stars })
    if (state.fail) {
      return route.fulfill({ status: 503, json: { succeeded: false } })
    }
    const filtered = empty ? [] : rows.filter(row => !stars || row.overallStars === stars)
    return ok({ items: filtered.slice((pageNumber - 1) * take, pageNumber * take), total: filtered.length, page: pageNumber, take, hasMore: pageNumber * take < filtered.length })
  })
  return state
}

test('Home previews four reviews and View all opens server filters and pagination', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const state = await setup(page)
  const summaryResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/customer/reviews/summary') && response.status() === 200)
  await page.goto('/')
  await summaryResponse
  const section = page.getByRole('region', { name: 'What customers say about WashGo', exact: true })
  await expect(section.getByText('8 published reviews', { exact: true })).toBeVisible()
  await expect(section.getByText('WashGo customer', { exact: true })).toHaveCount(4)
  await expect(section.getByRole('combobox')).toHaveCount(0)
  await expect(section.getByRole('button', { name: 'Next page', exact: true })).toHaveCount(0)
  await expect(section).not.toContainText('Never expose')
  await expect(section.locator('img[src^="blob:"]')).toBeVisible()
  if (process.env.CUSTOMER_FEEDBACK_QA) {
    await section.screenshot({ path: 'test-results/customer-feedback-desktop.png' })
  }
  expect(state.imageAuth).toEqual(['Bearer test'])
  await section.getByRole('button', { name: 'Photo 1', exact: true }).click()
  await expect(page.getByRole('dialog').locator('img[src^="blob:"]')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await section.getByRole('button', { name: 'View all reviews', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'All reviews', exact: true })
  await expect(dialog.getByText('8 reviews found', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(dialog.getByText('Careful laundry 5', { exact: true })).toBeVisible()
  await dialog.getByRole('combobox', { name: 'Filter by rating', exact: true }).click()
  await page.getByRole('option', { name: '4 stars', exact: true }).click()
  await expect(dialog.getByText('4 reviews found', { exact: true })).toBeVisible()
  expect(state.queries.at(-1)).toEqual({ page: 1, take: 4, stars: 4 })
  expect(state.summaryReads).toBe(1)
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (process.env.CUSTOMER_FEEDBACK_QA) {
    await dialog.screenshot({ path: 'test-results/customer-feedback-mobile.png' })
  }
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(section.getByText('8 published reviews', { exact: true })).toBeVisible()
  await expect(section.getByRole('button', { name: 'View all reviews', exact: true })).toBeFocused()
})

test('review slideshow selects dots, cycles at 3.5 seconds and stops for reduced motion', async ({ page }) => {
  await page.clock.install()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await setup(page, { longText: true })
  await page.goto('/')
  const carousel = page.getByRole('region', { name: 'Customer review slideshow', exact: true })
  await carousel.scrollIntoViewIfNeeded()
  const first = carousel.getByRole('button', { name: 'Show review 1', exact: true })
  const second = carousel.getByRole('button', { name: 'Show review 2', exact: true })
  await expect(first).toHaveAttribute('aria-current', 'true')
  await page.clock.fastForward(3600)
  await expect(second).toHaveAttribute('aria-current', 'true')
  await expect(carousel.locator('li[data-active="true"]')).toContainText('Careful laundry 2')
  await first.click()
  await expect(first).toHaveAttribute('aria-current', 'true')
  await page.clock.fastForward(8000)
  await expect(first).toHaveAttribute('aria-current', 'true')
  await page.keyboard.press('Tab')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(carousel.getByRole('button', { name: 'Pause reviews', exact: true })).toHaveCount(0)
  await page.mouse.move(0, 0)
  await page.getByRole('heading', { name: 'What customers say about WashGo' }).click()
  await page.clock.fastForward(8000)
  await expect(first).toHaveAttribute('aria-current', 'true')
  await second.click()
  await expect(second).toHaveAttribute('aria-current', 'true')
  await carousel.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await carousel.getByRole('button', { name: 'Next review', exact: true }).click()
  await expect(carousel.locator('li[data-active="true"]')).toContainText('Careful laundry 3')
  await carousel.getByRole('button', { name: 'Previous review', exact: true }).click()
  await expect(second).toHaveAttribute('aria-current', 'true')
  await first.click()
  await carousel.getByRole('button', { name: 'Previous review', exact: true }).click()
  await expect(carousel.locator('li[data-active="true"]')).toContainText('Careful laundry 4')
  await carousel.getByRole('button', { name: 'Next review', exact: true }).click()
  await expect(first).toHaveAttribute('aria-current', 'true')
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const active = carousel.locator('li[data-active="true"]')
    expect(await active.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true)
  }
})

test('empty feedback keeps its average unknown and a failed list can retry', async ({ page }) => {
  const state = await setup(page, { empty: true }); state.fail = true
  await page.goto('/')
  const section = page.locator('section[aria-labelledby="customer-feedback-heading"]')
  await expect(section.getByRole('alert')).toBeVisible()
  await expect(section.getByText('0 published reviews', { exact: true })).toBeVisible()
  await expect(section).toContainText('—')
  state.fail = false
  await section.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(section.getByRole('alert')).toHaveCount(0)
  await expect(section.getByText('WashGo customer', { exact: true })).toHaveCount(0)
})
