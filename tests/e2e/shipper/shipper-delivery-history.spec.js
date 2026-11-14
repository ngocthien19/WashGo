import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'
const photo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#c7d2fe"/></svg>')}`

async function setup(page, options = {}) {
  if (!options.guest) {
    await merchantSession(page, { role: 'Shipper', dark: options.dark })
  }
  const rows = Array.from({ length: 30 }, (_, index) => ({
    eventId: `event-${index}`, taskId: `task-${index}`, orderId: `order-${Math.floor(index / 2)}`, orderCode: `WG-${Math.floor(index / 2)}`, taskType: index % 2 + 1,
    lockerName: index % 2 ? 'Return Locker' : 'Deposit Locker', lockerImageUrls: [photo], lockerAddress: 'Historical locker address', boxNumber: `${index + 1}`,
    completedAt: new Date(Date.parse('2026-11-09T12:00:00Z') - index * 86400000).toISOString(), orderStatus: 12
  }))
  const state = { filters: [], failList: false, empty: false }
  await page.route('**/api/**', (route) => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^\/api/, '')
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    if (path === '/auth/me') {
      return ok({ id: 'history-user', fullName: 'Alex Driver', role: 'Shipper', email: 'driver@example.test' })
    }
    if (path === '/shipper-profile') {
      return ok({ revision: 'v1', id: 'shipper-1', fullName: 'Alex Driver', email: 'driver@example.test', vehicleType: 1, status: 1, isActive: true, totalDeliveries: 30, rating: 0 })
    }
    if (path === '/shipper-delivery/lockers/filter') {
      return ok([])
    }
    if (path === '/shipper-delivery/summary') {
      const body = request.postDataJSON(); const filtered = state.empty ? [] : rows.filter(row => (!body.fromDate || Date.parse(row.completedAt) / 1000 >= body.fromDate) && (!body.toDate || Date.parse(row.completedAt) / 1000 <= body.toDate)); return ok({ total: filtered.length, collectCount: filtered.filter(row => row.taskType === 1).length, returnCount: filtered.filter(row => row.taskType === 2).length })
    }
    if (path === '/shipper-delivery/history') {
      const body = request.postDataJSON()
      state.filters.push(body)
      expect(Object.keys(body).every((key) => ['fromDate', 'toDate', 'taskType', 'page', 'take', 'sortBy', 'keyword', 'lockerId', 'cancelledReturn'].includes(key))).toBe(true)
      if (state.failList && body.take > 1) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      const filtered = state.empty ? [] : rows.filter((row) => (!body.taskType || row.taskType === body.taskType)
        && (body.fromDate == null || Date.parse(row.completedAt) / 1000 >= body.fromDate)
        && (body.toDate == null || Date.parse(row.completedAt) / 1000 <= body.toDate))
      return route.fulfill({ json: { succeeded: true, total: filtered.length, list: filtered.slice((body.page - 1) * body.take, body.page * body.take) } })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: {} })
    }
    throw new Error(`Unexpected API: ${request.method()} ${path}`)
  })
  return state
}

test('history keeps separate events and pages with server totals through the shared sidebar', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/shipper/history')
  await expect(page.getByRole('heading', { name: 'Delivery history', exact: true })).toBeVisible()
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(13)
  await expect(page.getByRole('table').getByRole('img')).toHaveCount(12)
  await expect(page.getByRole('table').getByText('Historical locker address', { exact: true })).toHaveCount(12)
  await expect(page.getByRole('table').getByText('WG-0', { exact: true })).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Total deliveries in date range', exact: true }).locator('..')).toContainText('30')
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByRole('table').getByText('WG-6', { exact: true })).toHaveCount(2)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page')
  expect(state.filters.filter((filter) => filter.take === 12).at(-1).page).toBe(2)
  await expect(page.locator('main').getByRole('link')).toHaveCount(0)
})

test('filters delivery type and inclusive completion dates, resets page and preserves URL', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/shipper/history?page=2')
  await page.getByRole('combobox', { name: 'Delivery type', exact: true }).click()
  await page.getByRole('option', { name: 'Return', exact: true }).click()
  await expect(page).toHaveURL(/taskType=2/)
  await expect(page).not.toHaveURL(/page=2/)
  await page.getByLabel('From date', { exact: true }).fill('2026-11-01')
  await page.getByLabel('To date', { exact: true }).fill('2026-11-09')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect.poll(() => state.filters.filter((filter) => filter.take === 12).at(-1).fromDate).toBe(Date.parse('2026-11-01T00:00:00+07:00') / 1000)
  expect(state.filters.filter((filter) => filter.take === 12).at(-1).toDate).toBe(Date.parse('2026-11-09T23:59:59+07:00') / 1000)
  await page.reload()
  await expect(page.getByLabel('From date', { exact: true })).toHaveValue('2026-11-01')
  await expect(page.getByRole('table').getByText('Collection', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await expect(page).toHaveURL('/shipper/history')
})

test('failed list retries independently and empty results remain usable on mobile dark', async ({ page }) => {
  const state = await setup(page, { dark: true })
  state.failList = true
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/shipper/history')
  await expect(page.getByRole('heading', { name: 'Total deliveries in date range', exact: true }).locator('..')).toContainText('30')
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
  state.failList = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.getByRole('region', { name: 'Delivery history', exact: true })).toBeVisible()
  state.empty = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByText('No deliveries match your filters.', { exact: true })).toBeVisible()
})

test('invalid URL filters can be cleared', async ({ page }) => {
  await setup(page)
  await page.goto('/shipper/history?from=2026-02-30&to=2026-01-01')
  await expect(page.getByRole('alert')).toContainText('date range in the URL is invalid')
  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('guests never request delivery records', async ({ page }) => {
  const state = await setup(page, { guest: true })
  await page.goto('/shipper/history')
  await expect(page).toHaveURL('/login')
  expect(state.filters).toHaveLength(0)
})
