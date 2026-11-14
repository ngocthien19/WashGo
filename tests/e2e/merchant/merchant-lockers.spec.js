import { test, expect } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'

const id = '44444444-4444-4444-8444-444444444444'
const boxId = '55555555-5555-4555-8555-555555555555'

test('locker thumbnail uses returned images and handles a failed image', async ({ page }) => {
  await setup(page, { images: true })
  await page.goto('/merchant/lockers')
  const image = page.getByRole('table').getByRole('img', { name: 'Test Locker', exact: true })
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  await image.evaluate((element) => element.dispatchEvent(new Event('error')))
  await expect(image).toHaveCount(0)
  await expect(page.getByRole('table')).toContainText('Test Locker')
  await open(page, 'Locker details')
  const detailImage = page.getByRole('dialog').getByRole('img', { name: 'Locker photo 1', exact: true })
  await detailImage.scrollIntoViewIfNeeded()
  await expect.poll(() => detailImage.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByRole('dialog').getByRole('region', { name: 'Photos', exact: true })).toBeVisible()
})
async function setup(page, options = {}) {
  await merchantSession(page, options)

  const state = { filters: [], histories: [], empty: false, detailError: false, summaryError: false, summaryCalls: 0 }
  const locker = { id, code: 'LK-TEST-01', name: 'Test Locker', address: '123 Test Street', city: 'Test City', status: 1, lockerType: 1, totalBoxes: 6, availableBoxes: 99, emptyBoxesCount: 2, latitude: 10.77, longitude: 106.69, serviceAreaName: 'Central', description: 'Assigned locker station', imageUrls: options.images ? ['/uploads/mock/locker.svg'] : [], boxes: Array.from({ length: 6 }, (_, index) => ({ id: index === 0 ? boxId : `box-${index}`, boxNumber: String(index + 1), size: 2, status: [1, 2, 3, 4, 1, 2][index], hasItems: [1, 5].includes(index) })), depositPinCode: 'PRIVATE_PIN' }
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace(/^\/api/, '')
    if (path.startsWith('/uploads/mock/') && options.images) {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#b1cefc"/></svg>' })
    }
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    const fail = () => route.fulfill({ status: 403, json: { succeeded: false, message: 'merchant.invalidResponse' } })
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', fullName: 'Store Owner', role: options.role || 'Merchant' })
    }
    if (path === '/merchant-profile') {
      return ok({ id: 'merchant-test', businessName: 'Test Store', status: 1 })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === '/locker/summary') {
      state.summaryCalls++
      expect(url.searchParams.has('merchantId')).toBe(false)
      return state.summaryError ? fail() : ok({ totalLockers: 25, activeLockers: 15, maintenanceLockers: 7, inactiveLockers: 3, totalBoxes: 150, availableBoxes: 60, occupiedBoxes: 40, reservedBoxes: 30, maintenanceBoxes: 20, generatedAt: '2026-11-08T00:00:00Z' })
    }
    if (path === '/locker/filter') {
      const body = req.postDataJSON()
      expect(body).not.toHaveProperty('merchantId')
      state.filters.push(body)
      return route.fulfill({ json: { succeeded: true, total: state.empty ? 0 : 25, list: state.empty ? [] : [{ ...locker, name: body.page === 2 ? 'Page Two Locker' : locker.name }] } })
    }
    if (path === `/locker/${id}`) {
      return state.detailError ? fail() : ok(locker)
    }
    if (path === `/locker/${id}/usage-history`) {
      state.histories.push(Object.fromEntries(url.searchParams))
      return route.fulfill({ json: { succeeded: true, total: 10, list: [{ usageId: 'usage-1', boxId, orderId: '66666666-6666-4666-8666-666666666666', orderCode: 'WG-USAGE', boxNumber: '1', usageType: 1, putInAt: '2026-11-07T02:00:00Z', takenOutAt: null, orderStatus: 2 }] } })
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return state
}
async function open(page, name) {
  await page.getByRole('button', { name: 'Actions for Test Locker', exact: true }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}
test('locker list uses server totals, real empty counts and URL filters/sorting/paging', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/lockers')
  await expect(page.getByRole('table')).toContainText('Test Locker')
  const summary = page.getByRole('region', { name: 'Statistics for all assigned lockers' })
  const filters = page.locator('.workspace-filters').first()
  expect(await filters.locator('label').first().evaluate(el => getComputedStyle(el).color)).toBe('rgb(37, 50, 74)')
  expect(await filters.locator('label').first().evaluate(el => getComputedStyle(el).fontWeight)).toBe('500')
  expect(await filters.getByRole('search').getByRole('combobox').evaluate(el => getComputedStyle(el, '::placeholder').color)).toBe('rgb(37, 50, 74)')
  const statistic = summary.getByRole('heading', { name: 'Total lockers', exact: true })
  expect(await statistic.evaluate(el => getComputedStyle(el).color)).toBe('rgb(37, 50, 74)')
  expect(await statistic.evaluate(el => getComputedStyle(el).fontWeight)).toBe('500')
  const footer = page.locator('main footer').last()
  const count = await footer.locator('p').boundingBox(), nav = await footer.getByRole('navigation').boundingBox()
  expect(count.x).toBeLessThan(nav.x)
  expect(Math.abs(count.y + count.height / 2 - nav.y - nav.height / 2)).toBeLessThan(2)
  await expect(summary.getByRole('heading', { name: 'Total lockers' }).locator('..')).toContainText('25')
  await expect(page.getByRole('row').filter({ hasText: 'LK-TEST-01' })).not.toContainText('99')
  await page.getByRole('combobox', { name: 'Search lockers' }).fill('Test')
  await page.getByRole('combobox', { name: 'Search lockers' }).press('Enter')
  await expect.poll(() => state.filters.at(-1)?.keyword).toBe('Test')
  expect(state.summaryCalls).toBe(1)
  await expect(summary).toContainText('150')
  await page.getByRole('combobox', { name: 'Locker status' }).click()
  await page.getByRole('option', { name: 'Maintenance', exact: true }).click()
  await expect.poll(() => state.filters.at(-1)?.status).toBe(2)
  await page.getByRole('combobox', { name: 'Sort orders', exact: true }).click()
  await page.getByRole('option', { name: 'Name Z–A', exact: true }).click()
  await expect.poll(() => state.filters.at(-1)?.sortBy).toEqual([{ field: 'Name', isDescending: true }])
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.reload()
  await expect(page.getByRole('table')).toContainText('Page Two Locker')
  expect(state.summaryCalls).toBe(2)
  expect(state.filters.at(-1)).toMatchObject({ page: 2, status: 2, keyword: 'Test' })
})
test('locker detail displays all compartment states in six columns and no access secrets', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto('/merchant/lockers')
  await open(page, 'Locker details')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Compartments (6)' })).toBeVisible()
  await expect(dialog).not.toContainText('PRIVATE_PIN')
  const first = dialog.getByText('Box 1', { exact: true })
  const last = dialog.getByText('Box 6', { exact: true })
  await first.scrollIntoViewIfNeeded()
  expect(Math.abs((await first.boundingBox()).y - (await last.boundingBox()).y)).toBeLessThan(2)
  await dialog.getByRole('button', { name: 'Contains items', exact: true }).click()
  await expect(dialog.getByText('Box 1', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText('Box 2', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Open Google Maps' })).toHaveAttribute('href', /query=10.77%2C106.69/)
  await dialog.getByRole('tab', { name: 'Usage history', exact: true }).click()
  await expect(dialog.getByRole('tabpanel', { name: 'Usage history', exact: true })).toContainText('WG-USAGE')
  await expect(dialog.getByRole('tab', { name: 'Usage history', exact: true })).toHaveAttribute('aria-selected', 'true')
  await dialog.getByRole('tab', { name: 'Usage history', exact: true }).press('ArrowLeft')
  await expect(dialog.getByRole('tab', { name: 'Locker details', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(dialog.getByRole('tabpanel', { name: 'Locker details', exact: true })).toBeVisible()
})
test('usage history applies compartment and inclusive dates on BE before paging', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/lockers')
  await open(page, 'Usage history')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('table')).toContainText('WG-USAGE')
  await dialog.getByRole('combobox', { name: 'Filter by compartment' }).click()
  await page.getByRole('option', { name: 'Compartment 1', exact: true }).click()
  await dialog.getByLabel('From date', { exact: true }).fill('2026-11-07')
  await dialog.getByLabel('To date', { exact: true }).fill('2026-11-07')
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect.poll(() => state.histories.at(-1)?.fromDate).toBe('1793984400')
  expect(state.histories.at(-1)).toMatchObject({ boxId, toDate: '1794070799', page: '1' })
  await dialog.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect.poll(() => state.histories.at(-1)?.page).toBe('2')
  const count = state.histories.length
  await dialog.getByLabel('From date', { exact: true }).fill('2026-11-08')
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(state.histories).toHaveLength(count)
})
test('empty and failed detail/summary reads expose retry without pretending data or mutations', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/lockers')
  await expect(page.getByRole('table')).toBeVisible()
  state.detailError = true
  await open(page, 'Locker details')
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await expect(page.getByRole('dialog').getByText('PRIVATE_PIN')).toHaveCount(0)
  await page.keyboard.press('Escape')
  state.summaryError = true
  state.empty = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByText('No lockers match your search or have been assigned yet.')).toBeVisible()
  const summary = page.getByRole('region', { name: 'Statistics for all assigned lockers' })
  await expect(summary.getByRole('alert')).toBeVisible()
  state.summaryError = false
  await summary.getByRole('button', { name: 'Try again' }).click()
  await expect(summary.getByRole('heading', { name: 'Total lockers' })).toBeVisible()
})
test('mobile dark locker content stays within the viewport and modal footer is reachable', async ({ page }) => {
  await setup(page, { dark: true })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/merchant/lockers')
  await expect(page.getByRole('table')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await open(page, 'Locker details')
  const close = page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last()
  await close.scrollIntoViewIfNeeded()
  await expect(close).toBeVisible()
  await close.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
