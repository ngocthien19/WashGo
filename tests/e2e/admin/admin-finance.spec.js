import { adminUpgradeMocks } from '../helpers/adminUpgradeMocks'
import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'

const merchantId = 'a0000000-0000-4000-8000-000000000001', settlementId = 'b0000000-0000-4000-8000-000000000001', orderId = 'c0000000-0000-4000-8000-000000000001', refundId = 'd0000000-0000-4000-8000-000000000001', customerId = 'e0000000-0000-4000-8000-000000000001', serviceId = 'f0000000-0000-4000-8000-000000000001'

test('new backend: commission review requires evidence, accepts verified zero and guards settled rows', async ({ page }) => {
  await setup(page)
  const writes = []
  let done = false
  await page.route('**/api/finance/commission-snapshots/**', async route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON(); writes.push(body); done = true
      return route.fulfill({ json: { succeeded: true, data: { orderId, appliedRate: body.rate, reason: 'Missing', inSettlement: false } } })
    }
    return route.fulfill({ json: { succeeded: true, data: { page: 1, take: 12, total: done ? 0 : 2, items: done ? [] : [{ orderId, orderCode: 'WG-VERIFY', merchantName: 'Central Laundry', appliedRate: null, reason: 'Missing', inSettlement: false, collectedLaundryAmount: 100000 }, { orderId: refundId, orderCode: 'WG-LOCKED', appliedRate: 0, reason: 'LegacyUnverified', inSettlement: true, collectedLaundryAmount: 100000 }] } } })
  })
  await page.goto('/admin/finance?tab=commissionReview')
  const rows = page.getByRole('row')
  await expect(rows.filter({ hasText: 'WG-LOCKED' }).getByRole('button')).toBeDisabled()
  await rows.filter({ hasText: 'WG-VERIFY' }).getByRole('button').click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  expect(writes).toHaveLength(0)
  await dialog.getByRole('spinbutton').fill('0')
  await dialog.getByRole('textbox').fill('Verified signed contract for this order')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(writes).toHaveLength(1)
  expect(writes[0]).toMatchObject({ rate: 0, expectedMissing: true, expectedRate: null, evidence: 'Verified signed contract for this order', operationId: expect.any(String) })
})

test('clear all resets finance filters and keeps the current business tab', async ({ page }) => {
  const state = await setup(page)
  for (const tab of ['revenue', 'settlements', 'refunds']) {
    await page.goto(`/admin/finance?tab=${tab}&merchantId=${merchantId}&keyword=invoice&status=1&listFrom=2026-10-01&listTo=2026-10-10&period=custom&from=2026-10-01&to=2026-10-10&page=3`)
    await page.getByRole('button', { name: 'Clear all', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`tab=${tab}`))
    const params = new URL(page.url()).searchParams
    for (const key of ['merchantId', 'keyword', 'status', 'listFrom', 'listTo', 'page']) {
      expect(params.has(key)).toBe(false)
    }
    expect(params.get('period')).toBe('month')
    await expect(page.getByRole('button', { name: 'Clear all', exact: true })).toHaveCount(0)
    if (tab !== 'revenue') {
      await expect(page.getByRole('search').getByRole('combobox')).toHaveValue('')
      await expect(page.getByLabel('From date', { exact: true })).toHaveValue('')
    }
  }
  expect(state.writes).toHaveLength(0)
})
async function setup(page, options = {}) {
  await merchantSession(page, { role: 'Admin', ...options })
  const commission = { merchantId, merchantName: 'Central Laundry', paidOrderCount: 2, grossRevenue: 100000, refundedAmount: 10000, netRevenue: 90000, commissionRate: 20, commissionAmount: 18000, payoutAmount: 72000 }
  const settlement = { ...commission, id: settlementId, orderCount: 2, status: 1, periodFrom: '2026-10-01T00:00:00Z', periodTo: '2026-10-31T00:00:00Z', paymentReference: null, paidAt: null, createdOn: 1793500000 }
  const refund = { id: refundId, orderId, orderCode: 'WG26110801', customerId, customerName: 'Alex Customer', amount: 30000, reason: 'Cancelled order', status: 1, reviewNote: null, reviewedAt: null, refundReference: null, refundedAt: null, createdOn: 1794099600 }
  const state = { commission, settlement, refund, queries: [], writes: [], reads: 0, stale: false, unknown: false, changedPreview: false, commissionReads: 0, settlementTotal: options.settlementTotal || 1 }
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(/^\/api/, ''), body = /application\/json/.test(req.headers()['content-type'] || '') ? req.postDataJSON() : undefined
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    if (await adminUpgradeMocks(route, state, [{ id: merchantId, name: 'Central Laundry', status: 1 }])) {
      return
    }
    if (path === '/auth/me') {
      return ok({ id: 'admin-test', fullName: 'Test Admin', email: 'admin@example.test', role: 'Admin' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: {} })
    }
    if (path === '/merchant/filter') {
      return route.fulfill({ json: { succeeded: true, list: [{ id: merchantId, businessName: 'Central Laundry', status: 1, imageUrls: [] }], total: 1 } })
    }
    if (path === '/finance/revenue-report') {
      state.queries.push({ path, body })
      return ok({ fromDate: new Date(body.fromDate * 1000).toISOString(), toDate: new Date(body.toDate * 1000).toISOString(), totalRevenue: 110000, laundryRevenue: 100000, storageFeeRevenue: 15000, cancellationFeeRevenue: 5000, refundedAmount: 10000, paidOrderCount: 2, daily: [{ date: '2026-11-08', revenue: 110000 }], byMerchant: [{ merchantId, merchantName: 'Central Laundry', revenue: 110000, paidOrderCount: 2 }], byService: [{ serviceId, serviceName: 'Everyday wash', amount: 120000, quantity: 2 }] })
    }
    if (path === '/finance/revenue-report/export') {
      return route.fulfill({ contentType: 'text/csv', body: '\uFEFFMuc,Gia tri\nTong doanh thu,110000\n' })
    }
    if (path === '/finance/commissions') {
      state.commissionReads++; state.queries.push({ path, body })
      return ok([{ ...commission, ...(state.changedPreview && state.commissionReads > 1 ? { payoutAmount: 70000 } : {}) }])
    }
    if (path === '/finance/settlements/filter') {
      state.reads++; state.queries.push({ path, body })
      if (state.stale && body.take === 100 && state.reads > 2) {
        settlement.status = 2
      }
      const rows = body.status == null || body.status === settlement.status ? [settlement] : []
      return route.fulfill({ json: { succeeded: true, list: rows, total: rows.length ? state.settlementTotal : 0 } })
    }
    if (path === '/payment/refund-requests' && req.method() === 'GET') {
      state.queries.push({ path, status: url.searchParams.get('status') }); return ok(!url.searchParams.get('status') || Number(url.searchParams.get('status')) === refund.status ? [refund] : [])
    }
    if (path === `/payment/refund-requests/${refundId}` && req.method() === 'GET') {
      return ok(refund)
    }
    if (req.method() === 'POST') {
      state.writes.push({ path, body })
      if (state.unknown) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      if (path === '/finance/settlements') {
        Object.assign(settlement, { periodFrom: new Date(body.fromDate * 1000).toISOString(), periodTo: new Date(body.toDate * 1000).toISOString() }); return ok(settlement)
      }
      if (path === `/finance/settlements/${settlementId}/confirm-paid`) {
        Object.assign(settlement, { status: 2, paymentReference: body.reference, paidAt: '2026-11-08T00:00:00Z' }); return ok(settlement)
      }
      if (path.endsWith('/review')) {
        Object.assign(refund, { status: body.approve ? 2 : 3, reviewNote: body.reviewNote }); return ok(refund)
      }
      if (path.endsWith('/confirm-refunded')) {
        Object.assign(refund, { status: 4, refundReference: body.refundReference, refundedAt: '2026-11-08T00:00:00Z' }); return ok(refund)
      }
    }
    throw new Error(`Unexpected finance API ${req.method()} ${path}`)
  })
  return state
}
async function menu(page, action, refund = false) {
  await page.getByRole('button', { name: `Finance actions for ${refund ? 'WG26110801' : 'Central Laundry'}`, exact: true }).click()
  await page.getByRole('menuitem', { name: action, exact: true }).click()
}
async function confirm(dialog) {
  await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
}

test('backend sync: blocked settlement quote withholds incomplete earnings and cannot be confirmed', async ({ page }) => {
  const state = await setup(page)
  state.canCreate = false
  Object.assign(state.commission, { commissionComplete: false, ordersWithoutCommissionSnapshot: 2, uncoveredNetAmount: 90000 })
  await page.goto(`/admin/finance?tab=settlements&merchantId=${merchantId}`)
  await page.getByRole('button', { name: 'Create settlement', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Preview figures', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('cannot be settled')
  await dialog.getByRole('checkbox').check()
  await expect(dialog.getByRole('button', { name: 'Confirm settlement creation', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
})

test('backend sync: settlement detail uses direct GET and paginated frozen source rows', async ({ page }) => {
  const state = await setup(page)
  state.lines = Array.from({ length: 13 }, (_, i) => ({ orderId: `${String(i + 1).padStart(8, '0')}-0000-4000-8000-000000000001`, orderCode: `WG-LINE-${i + 1}`, collected: 50000, refunded: 10000, commissionRate: 20, commission: 8000, payout: 32000 }))
  await page.goto('/admin/finance?tab=settlements')
  await menu(page, 'View details')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('WG-LINE-12')
  await dialog.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(dialog).toContainText('WG-LINE-13')
  expect(state.writes).toHaveLength(0)
})

test('revenue uses server date/Merchant scope and downloads the CSV response', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/finance?from=2026-11-01&to=2026-11-08')
  await expect(page.getByRole('table', { name: 'Merchants in report' })).toContainText('Central Laundry')
  await expect(page.getByRole('heading', { name: 'Collections less refunds', exact: true })).toBeVisible()
  await expect(page.getByText(/before discounts and weight surcharges/)).toBeVisible()
  await page.getByRole('combobox', { name: 'Merchant', exact: true }).click()
  await page.getByRole('option', { name: 'Central Laundry', exact: true }).click()
  await expect.poll(() => state.queries.filter(row => row.path === '/finance/revenue-report').at(-1)?.body.merchantId).toBe(merchantId)
  expect(state.queries[0].body.fromDate).toBe(Date.parse('2026-11-01T00:00:00+07:00') / 1000)
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click()
  expect((await downloaded).suggestedFilename()).toBe('washgo-finance-2026-11-01-2026-11-08.csv')
  expect(state.writes).toHaveLength(0)
})
test('commissions show the server breakdown and current rate as a reference', async ({ page }) => {
  await setup(page)
  await page.goto('/admin/finance?tab=commissions')
  await page.getByRole('button', { name: 'View details', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Current Merchant rate: 20%')
  await expect(dialog).toContainText('72,000')
  await expect(dialog).toContainText('cross-period refunds')
  await dialog.getByRole('button', { name: 'Close', exact: true }).first().click()
  await expect(dialog).toHaveCount(0)
})

test('refund notification scope shows only the notified order and can return to all requests', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/admin/finance?tab=refunds&orderId=${orderId}`)
  await expect(page.getByText('Showing refund requests for the notified order.', { exact: true })).toBeVisible()
  await expect(page.getByRole('table')).toContainText('WG26110801')
  expect(state.queries.find(row => row.path === '/payment/refund-requests/filter')).toMatchObject({ path: '/payment/refund-requests/filter', body: { page: 1, take: 12, orderId } })
  await page.getByRole('button', { name: 'View all requests', exact: true }).click()
  await expect(page).not.toHaveURL(/orderId=/)
})

test('finance period presets and custom dates preserve Merchant scope across reload', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/admin/finance?merchantId=${merchantId}`)
  for (const [label, period] of [['Day', 'day'], ['Week', 'week'], ['Month', 'month']]) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`period=${period}`))
    await expect.poll(() => state.queries.filter(row => row.path === '/finance/revenue-report').at(-1)?.body.merchantId).toBe(merchantId)
  }
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await page.getByLabel('From date', { exact: true }).fill('2026-10-01')
  await page.getByLabel('To date', { exact: true }).fill('2026-10-05')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect.poll(() => state.queries.filter(row => row.path === '/finance/revenue-report').at(-1)?.body.fromDate).toBe(Date.parse('2026-10-01T00:00:00+07:00') / 1000)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Custom', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('table', { name: 'Merchants in report' })).toContainText('Central Laundry')
})
test('settlements page and filter server data without inheriting report dates', async ({ page }) => {
  const state = await setup(page, { settlementTotal: 13 })
  await page.goto('/admin/finance?tab=settlements&page=2&from=2026-10-01&to=2026-10-31')
  await expect(page.getByRole('table')).toContainText('Central Laundry')
  expect(state.queries[0].body).toEqual({ page: 2, take: 12 })
  await expect(page.getByLabel('From date', { exact: true })).toHaveValue('')
  await page.getByRole('combobox', { name: 'Status', exact: true }).click()
  await page.getByRole('option', { name: 'Paid', exact: true }).click()
  await expect.poll(() => state.queries.filter(row => row.path.endsWith('/filter')).at(-1)?.body).toEqual({ page: 1, take: 12, status: 2 })
})
test('create settlement previews fresh server figures then creates with explicit reconciliation confirmation', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/finance?tab=settlements')
  await page.getByRole('button', { name: 'Create settlement', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Preview figures', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('combobox', { name: 'Merchant', exact: true }).click()
  await page.getByRole('option', { name: 'Central Laundry', exact: true }).click()
  await dialog.getByLabel('From date', { exact: true }).fill('2026-10-01')
  await dialog.getByLabel('To date', { exact: true }).fill('2026-10-31')
  await dialog.getByRole('button', { name: 'Preview figures', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Settlement breakdown' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Confirm settlement creation', exact: true })).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm settlement creation', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body).toMatchObject({ merchantId, fromDate: Date.parse('2026-10-01T00:00:00+07:00') / 1000, toDate: Date.parse('2026-10-31T23:59:59+07:00') / 1000 })
  expect(state.commissionReads).toBe(2)
})
test('changed settlement preview never posts and uncertain payout blocks resubmission', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/admin/finance?tab=settlements&merchantId=${merchantId}`)
  await page.getByRole('button', { name: 'Create settlement', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Preview figures', exact: true }).click()
  await expect(dialog.getByRole('checkbox')).toBeVisible()
  state.changedPreview = true
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm settlement creation', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Figures changed')
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await menu(page, 'Record payout')
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Transfer reference', { exact: true }).fill('BANK-123')
  state.unknown = true
  await confirm(dialog)
  await expect(dialog.getByRole('alert')).toContainText('uncertain')
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
})
test('payout requires a reference, verifies fresh status and refreshes the settlement', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/finance?tab=settlements')
  await menu(page, 'Record payout')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('does not execute a bank transaction')
  await dialog.getByLabel('Transfer reference', { exact: true }).fill('BANK-123')
  await confirm(dialog)
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('table')).toContainText('Paid')
  expect(state.writes[0]).toMatchObject({ path: `/finance/settlements/${settlementId}/confirm-paid`, body: { reference: 'BANK-123' } })
})
test('refund approval and recording the external transfer are separate actions', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/finance?tab=refunds')
  await menu(page, 'Approve refund', true)
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Review note / reason', { exact: true }).fill('Verified original payment')
  await confirm(dialog)
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  await menu(page, 'Record completed refund', true)
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Transfer reference', { exact: true }).fill('REFUND-123')
  await confirm(dialog)
  await expect(dialog).toHaveCount(0)
  expect(state.writes[1].body).toMatchObject({ refundReference: 'REFUND-123' })
  expect(state.refund.status).toBe(4)
})
test('refund rejection requires a reason and guards concurrent review', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/finance?tab=refunds')
  await menu(page, 'Reject refund', true)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(state.writes).toHaveLength(0)
  await dialog.getByLabel('Review note / reason', { exact: true }).fill('Duplicate request')
  state.refund.status = 2
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Figures changed')
  expect(state.writes).toHaveLength(0)
})
test('mobile dark financial tables scroll within the page and keep modal controls accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page, { dark: true })
  await page.goto('/admin/finance?tab=settlements')
  await expect(page.getByRole('table')).toContainText('Central Laundry')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await menu(page, 'Record payout')
  await expect(page.getByRole('dialog').getByLabel('Transfer reference', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})


test('finance filters are readable and aligned while preview identifies its Merchant inside the breakdown', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 })
  const state = await setup(page)
  await page.goto('/admin/finance')
  const filters = page.locator('section.workspace-filters')
  await expect(filters.locator('p.tabular-nums')).toHaveClass(/text-muted-foreground/)
  await expect(filters.locator('p.tabular-nums').locator('..')).not.toHaveClass(/bg-primary/)
  expect(await filters.getByRole('combobox', { name: 'Merchant', exact: true }).evaluate(el => getComputedStyle(el).fontSize)).toBe('14px')
  const chart = page.getByRole('heading', { name: 'Collection and refund trend', exact: true })
  await expect(chart).toHaveClass(/bg-primary\/5/)
  const services = page.getByRole('heading', { name: 'Service value on paid orders', exact: true }).locator('../..')
  await expect(services).toHaveClass(/bg-primary\/5/)
  await page.getByRole('tab', { name: 'Settlements', exact: true }).click()
  const inputs = ['Merchant', 'Status', 'Date basis']
  const boxes = []
  for (const name of inputs) {
    const input = filters.getByRole('combobox', { name, exact: true })
    expect(await input.evaluate(el => getComputedStyle(el).fontSize)).toBe('14px')
    boxes.push(await input.boundingBox())
  }
  expect(boxes[0].y).toBeCloseTo(boxes[1].y, 0)
  expect(boxes[1].y).toBeCloseTo(boxes[2].y, 0)
  const search = filters.locator('input[name="keyword"]')
  expect(await search.evaluate(el => getComputedStyle(el).fontSize)).toBe('14px')
  await search.fill('bank-reference')
  await search.press('Enter')
  await expect.poll(() => state.queries.filter(row => row.path === '/finance/settlements/filter').at(-1).body.keyword).toBe('bank-reference')
  await page.getByRole('button', { name: 'Create settlement', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('combobox', { name: 'Merchant', exact: true }).click()
  await page.getByRole('option', { name: 'Central Laundry', exact: true }).click()
  await dialog.getByLabel('From date', { exact: true }).fill('2026-10-01')
  await dialog.getByLabel('To date', { exact: true }).fill('2026-10-31')
  await dialog.getByRole('button', { name: 'Preview figures', exact: true }).click()
  const summary = dialog.getByRole('heading', { name: 'Settlement breakdown', exact: true }).locator('..')
  await expect(summary.getByText('Central Laundry', { exact: true })).toBeVisible()
  await expect(dialog).toContainText('commission is calculated per order by the system')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(state.writes).toHaveLength(0)
})
