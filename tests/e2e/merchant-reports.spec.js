import { test, expect as baseExpect } from '@playwright/test'
const expect = baseExpect.configure({ timeout: 20000 })
import { merchantSession } from './helpers/merchantSession'

async function setup(page, options = {}) {
  await merchantSession(page, options)
  const state = { calls: [], fail: false, zero: false }
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^\/api/, '')
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    expect(path).not.toMatch(/finance|customer\/|merchant-reports/)
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', fullName: 'Store Owner', role: 'Merchant' })
    }
    if (path === '/merchant-profile') {
      return ok({ id: 'merchant-test', businessName: 'Test Store', status: 1 })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === '/wash-order/filter') {
      expect(req.method()).toBe('POST')
      const body = req.postDataJSON()
      expect(Object.keys(body).sort()).toEqual((body.status ? ['fromDate', 'toDate', 'page', 'take', 'status'] : ['fromDate', 'toDate', 'page', 'take']).sort())
      expect(body).toMatchObject({ page: 1, take: 1 })
      expect(body.fromDate).toBeLessThan(body.toDate)
      state.calls.push(body)
      if (state.fail) {
        return route.fulfill({ status: 500, json: { succeeded: false, message: 'merchant.invalidResponse' } })
      }
      const day = new Date(body.fromDate * 1000 + 7 * 3600000).toISOString().slice(0, 10)
      const current = day >= '2026-11-01'
      const days = (body.toDate - body.fromDate + 1) / 86400
      const base = body.status ? current ? 8 : 10 : current ? 120 : 100
      const total = state.zero ? 0 : Math.round(base * days)
      return route.fulfill({ json: { succeeded: true, total, list: [] } })
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return state
}

test('reports show real count comparisons and charts without inventing revenue or best sellers', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/reports?period=custom&from=2026-11-01&to=2026-11-07')
  await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeEnabled({ timeout: 30000 })
  await expect(page.getByRole('region', { name: 'Total orders', exact: true })).toContainText('+20%')
  await expect(page.getByRole('region', { name: 'Completed orders', exact: true })).toContainText('-20%')
  await expect(page.getByRole('region', { name: 'Total revenue', exact: true })).toContainText('—')
  await expect(page.getByRole('region', { name: 'On-time rate', exact: true })).toContainText('Report data unavailable')
  await expect(page.getByRole('img', { name: 'Order chart', exact: true })).toBeVisible()
  await expect(page.getByText('Store best-seller reporting is not available yet.', { exact: false })).toBeVisible()
  expect(state.calls.length).toBeLessThanOrEqual(28)
  await page.getByText('View data table', { exact: true }).click()
  await expect(page.getByRole('table')).toContainText('120')
  await page.getByRole('button', { name: '11-01: Current period 120, Previous period 100', exact: true }).focus()
  await expect(page.getByText('11-01 · Current period: 120 · Previous period: 100', { exact: true })).toBeVisible()
})

test('CSV exports the current visible range and supported metrics only', async ({ page }) => {
  await setup(page)
  await page.goto('/merchant/reports?period=custom&from=2026-11-01&to=2026-11-07')
  const button = page.getByRole('button', { name: 'Export CSV report', exact: true })
  await expect(button).toBeEnabled()
  const download = page.waitForEvent('download')
  await button.click()
  const file = await download
  expect(file.suggestedFilename()).toBe('washgo-report-2026-11-01-2026-11-07.csv')
  const stream = await file.createReadStream()
  const buffers = []
  for await (const chunk of stream) {
    buffers.push(chunk)
  }
  const csv = Buffer.concat(buffers).toString('utf8')
  expect(csv).toContain('"Total orders","840","700","20"')
  expect(csv).toContain('"Total revenue","Report data unavailable"')
  expect(csv).not.toMatch(/PIN|customerId|mock-access/)
})

test('day week month and valid custom dates update URL and server filters', async ({ page }) => {
  await setup(page)
  await page.goto('/merchant/reports')
  for (const period of ['Day', 'Week', 'Month']) {
    await page.getByRole('button', { name: period, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`period=${period.toLowerCase()}`))
    await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeEnabled()
  }
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await page.getByLabel('From date', { exact: true }).fill('2026-10-01')
  await page.getByLabel('To date', { exact: true }).fill('2026-10-07')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page).toHaveURL(/from=2026-10-01&to=2026-10-07/)
  await page.reload()
  await expect(page.getByLabel('From date', { exact: true })).toHaveValue('2026-10-01')
  await expect(page.getByRole('button', { name: 'Custom', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await page.getByRole('button', { name: 'Clear date range', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('From date', { exact: true })).toHaveCount(0)
})

test('invalid custom ranges cannot fetch and failed reads cannot export partial or zero data', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/reports?period=custom&from=2026-11-01&to=2026-11-07')
  await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeEnabled()
  const before = state.calls.length
  await page.getByLabel('From date', { exact: true }).fill('2020-01-01')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('up to 366 days')
  expect(state.calls.length).toBe(before)
  state.fail = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeDisabled()
  await expect(page.getByRole('region', { name: 'Total orders', exact: true })).toHaveCount(0)
  state.fail = false
  state.zero = true
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Total orders', exact: true })).toContainText('0%')
})

test('mobile dark report stays within viewport and the reports nav entry is enabled', async ({ page }) => {
  await setup(page, { dark: true })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/merchant/reports?period=custom&from=2026-11-01&to=2026-11-07')
  await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Open Merchant navigation', exact: true }).click()
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Reports', exact: true })).toHaveAttribute('aria-current', 'page')
})
