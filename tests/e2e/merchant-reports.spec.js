import { test, expect } from '@playwright/test'
import { merchantSession } from './helpers/merchantSession'
import { reportFixture } from './helpers/merchantReportData'

async function setup(page, options = {}) {
  await merchantSession(page, options)
  const state = { calls: [], exports: [], fail: false, missing: false, noRate: false, exportFail: false, negative: false }
  await page.route('**/api/**', async (route) => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(/^\/api/, '')
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    expect(path).not.toMatch(/finance|customer\/|wash-order/)
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', fullName: 'Store Owner', role: 'Merchant' })
    }
    if (path === '/merchant-profile') {
      return ok({ id: 'merchant-test', businessName: 'Test Store', status: 1 })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/uploads/mock/')) {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#2563eb"/></svg>' })
    }
    if (path === '/merchant-reports/overview') {
      expect(req.method()).toBe('GET')
      const params = Object.fromEntries(url.searchParams)
      expect(Object.keys(params).every((key) => ['period', 'from', 'to', 'top'].includes(key))).toBe(true)
      state.calls.push(params)
      if (state.fail) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      const report = reportFixture(params)
      if (state.missing) {
        report.kpis.ordersWithoutCommissionSnapshot = 2
      }
      if (state.noRate) {
        report.kpis.onTimeRate = { numerator: 0, denominator: 0, rate: null, previousNumerator: 0, previousDenominator: 0, previousRate: null, changePoints: null }
      }
      if (state.negative) {
        report.series[0].netRevenue = -400000; report.kpis.netRevenue.current = -400000; report.kpis.merchantPayout.current = -320000
      }
      return ok(report)
    }
    if (path === '/merchant-reports/export') {
      state.exports.push(Object.fromEntries(url.searchParams))
      if (state.exportFail) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      return route.fulfill({ contentType: 'text/csv; charset=utf-8', body: '\uFEFFMetric,Current\r\nRevenue after refunds,1000000\r\nIncome after commission,800000\r\n' })
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return state
}
const url = '/merchant/reports?period=custom&from=2026-11-01&to=2026-11-07'

test('one report shows actual metrics, pp rate change, top-service images and accessible charts', async ({ page }) => {
  const state = await setup(page)
  await page.goto(url)
  await expect(page.getByRole('region', { name: 'Income after commission', exact: true })).toContainText('800,000')
  await expect(page.getByRole('region', { name: 'Orders created in period', exact: true })).toContainText('+20%')
  await expect(page.getByRole('region', { name: 'Orders completed in period', exact: true })).toContainText('-20%')
  await expect(page.getByRole('region', { name: 'On-time laundry completion', exact: true })).toContainText('+10 pp')
  await expect(page.getByRole('region', { name: 'On-time laundry completion', exact: true })).not.toContainText('9/10 eligible orders')
  const revenue = page.getByRole('heading', { name: 'Revenue after refunds (before commission)', exact: true }).locator('..')
  await revenue.getByText('View data table', { exact: true }).click()
  await expect(revenue.getByRole('table')).toContainText('Not yet computed')
  await revenue.getByRole('button', { name: /Bucket 1: Current period/ }).focus()
  await expect(revenue.locator('[aria-live="polite"]')).toContainText('400,000')
  const image = page.getByRole('img', { name: 'Everyday laundry', exact: true })
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByText('Service value', { exact: true })).toBeVisible()
  expect(state.calls).toHaveLength(1)
})

test('CSV comes from Merchant export with the applied range and matching top limit', async ({ page }) => {
  const state = await setup(page)
  await page.goto(url)
  const button = page.getByRole('button', { name: 'Export CSV report', exact: true })
  await expect(button).toBeEnabled()
  const downloaded = page.waitForEvent('download')
  await button.click()
  const file = await downloaded
  expect(file.suggestedFilename()).toBe('washgo-report-2026-11-01-2026-11-07.csv')
  const buffers = [], stream = await file.createReadStream()
  for await (const chunk of stream) {
    buffers.push(chunk)
  }
  const csv = Buffer.concat(buffers).toString('utf8')
  expect(csv.startsWith('\uFEFF')).toBe(true)
  expect(csv).toContain('Income after commission,800000')
  expect(state.exports).toEqual([{ period: 'custom', from: '2026-11-01', to: '2026-11-07', granularity: 'day', top: '5' }])
})

test('presets and custom dates keep URL state and send BE calendar periods', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/reports')
  for (const [name, period] of [['Day', 'today'], ['Week', 'week'], ['Month', 'month']]) {
    await page.getByRole('button', { name, exact: true }).click()
    await expect.poll(() => state.calls.at(-1)?.period).toBe(period)
    await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeEnabled()
  }
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await page.getByLabel('From date', { exact: true }).fill('2026-10-01')
  await page.getByLabel('To date', { exact: true }).fill('2026-10-07')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page).toHaveURL(/from=2026-10-01&to=2026-10-07/)
  await expect.poll(() => state.calls.at(-1)?.from).toBe('2026-10-01')
  await page.reload()
  await expect(page.getByLabel('From date', { exact: true })).toHaveValue('2026-10-01')
  await page.getByRole('button', { name: 'Clear date range', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Month', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('invalid ranges do not fetch; failed reports cannot export and retry recovers', async ({ page }) => {
  const state = await setup(page)
  await page.goto(url)
  await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeEnabled()
  const before = state.calls.length
  await page.getByLabel('From date', { exact: true }).fill('2020-01-01')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('up to 366 days')
  expect(state.calls.length).toBe(before)
  state.fail = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeDisabled()
  await expect(page.getByRole('region', { name: 'Income after commission', exact: true })).toHaveCount(0)
  state.fail = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Income after commission', exact: true })).toBeVisible()
})

test('missing commission withholds income and export; zero eligible on-time sample stays unavailable', async ({ page }) => {
  const state = await setup(page)
  state.missing = true; state.noRate = true
  await page.goto(url)
  const income = page.getByRole('region', { name: 'Income after commission', exact: true })
  await expect(income).toContainText('Awaiting reconciliation')
  await expect(income).not.toContainText('800,000')
  await expect(page.getByRole('region', { name: 'On-time laundry completion', exact: true })).not.toContainText('0/0 eligible orders')
  await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeDisabled()
  expect(state.exports).toHaveLength(0)
})

test('negative revenue and export failure do not become zero or a successful download', async ({ page }) => {
  const state = await setup(page)
  state.negative = true; state.exportFail = true
  await page.goto(url)
  await expect(page.getByRole('region', { name: 'Income after commission', exact: true })).toContainText(/-.*320,000/)
  await page.getByRole('button', { name: 'Export CSV report' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeEnabled()
  expect(state.exports).toHaveLength(1)
})

test('mobile dark charts scroll internally without page overflow', async ({ page }) => {
  await setup(page, { dark: true })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(url)
  await expect(page.getByRole('button', { name: 'Export CSV report' })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
