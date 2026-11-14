import { adminUpgradeMocks } from '../helpers/adminUpgradeMocks'
import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'
test.use({ timezoneId: 'America/New_York' })
const id = 'a0000000-0000-4000-8000-000000000001'
async function setup(page, options = {}) {
  await merchantSession(page, { role: 'Admin', ...options })
  const promotion = { id, code: 'SAVE20', description: 'Save on your laundry', discountType: 1, discountValue: 20, minOrderAmount: 100000, maxDiscountAmount: 30000, startAt: '2026-11-01T00:00:45Z', endAt: '2026-12-01T00:00:00Z', usageLimit: 100, usageLimitPerCustomer: 1, usedCount: options.used || 0, isActive: true, status: 2 }
  promotion.canChangeCode = promotion.usedCount === 0
  const state = { promotion, filters: [], writes: [], reads: 0, stale: false, unknown: false, removed: false }
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(/^\/api/, ''), body = /application\/json/.test(req.headers()['content-type'] || '') ? req.postDataJSON() : undefined
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    if (await adminUpgradeMocks(route, state, [])) {
      return
    }
    if (path === '/auth/me') {
      return ok({ id: 'admin-test', fullName: 'Test Admin', role: 'Admin' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: {} })
    }
    if (path === '/promotion/filter') {
      state.filters.push(body)
      const rows = !state.removed && (body.status == null || body.status === promotion.status) ? [promotion] : []
      return route.fulfill({ json: { succeeded: true, list: rows, total: rows.length } })
    }
    if (path === `/promotion/${id}/statistics`) {
      return ok({ promotionId: id, code: promotion.code, usedCount: 2, totalDiscountAmount: 40000, totalOrderAmount: 200000, revenue: 160000, paidRevenue: 80000, daily: [{ date: '2026-11-08', usedCount: 2, discountAmount: 40000, revenue: 160000 }] })
    }
    if (path === `/promotion/${id}/statistics/export`) {
      return route.fulfill({ contentType: 'text/csv', body: '\uFEFFNgay,SoLuotDung,TongTienGiam,DoanhThu\n2026-11-08,2,40000,160000\n' })
    }
    if (path === `/promotion/${id}` && req.method() === 'GET') {
      state.reads++
      if (state.stale && state.reads > 1) {
        promotion.usedCount++
      }
      return ok(promotion)
    }
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method())) {
      state.writes.push({ path, body, method: req.method() })
      if (state.unknown) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      if (path === '/promotion') {
        Object.assign(promotion, body); return ok(promotion)
      }
      if (path.endsWith('/toggle-active')) {
        promotion.isActive = !promotion.isActive; promotion.status = promotion.isActive ? 2 : 0; return ok(promotion.isActive)
      }
      if (req.method() === 'DELETE') {
        state.removed = true; return ok(true)
      }
    }
    throw new Error(`Unexpected promotion API ${req.method()} ${path}`)
  })
  return state
}
async function menu(page, action) {
  await page.getByRole('button', { name: 'Actions for SAVE20', exact: true }).click()
  await page.getByRole('menuitem', { name: action, exact: true }).click()
}

test('backend sync: a committed promotion batch is reconciled once after a lost response', async ({ page }) => {
  const state = await setup(page)
  state.batchUnknown = true
  await page.goto('/admin/promotions')
  await page.getByRole('checkbox', { name: 'Select all promotions on this page', exact: true }).check()
  await page.getByRole('button', { name: 'Bulk actions', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Deactivate promotion', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ path: '/promotion/batch', body: { operationId: expect.any(String), items: [{ id, expectedVersion: 'version-1' }], action: 'Status', isActive: false } })
  expect(state.promotion.isActive).toBe(false)
})
test('filters use server status zero and inclusive Vietnam validity dates', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/promotions')
  await expect(page.getByRole('table')).toContainText('SAVE20')
  await page.getByRole('combobox', { name: 'Status', exact: true }).click()
  await page.getByRole('option', { name: 'Inactive', exact: true }).click()
  await expect.poll(() => state.filters.filter(row => row.take === 12).at(-1)?.status).toBe(0)
  await page.getByLabel('From date', { exact: true }).fill('2026-11-08')
  await page.getByLabel('To date', { exact: true }).fill('2026-11-09')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect.poll(() => state.filters.filter(row => row.take === 12).at(-1)?.fromDate).toBe(Date.parse('2026-11-08T00:00:00+07:00') / 1000)
  expect(state.writes).toHaveLength(0)
})
test('create validates and sends UTC timestamps with nullable optional limits', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/promotions')
  await page.getByRole('button', { name: 'Add promotion', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Save promotion', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  for (const [label, value] of [['Promotion code', 'wash30'], ['Discount (% or VND)', '30'], ['Starts at (Vietnam time)', '2026-11-08T08:00'], ['Ends at (Vietnam time)', '2026-12-08T08:00']]) {
    await dialog.getByLabel(label, { exact: true }).fill(value)
  }
  await dialog.getByRole('button', { name: 'Save promotion', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body).toMatchObject({ code: 'WASH30', startAt: '2026-11-08T01:00:00.000Z', usageLimit: null, maxDiscountAmount: null, isActive: true })
  expect(state.writes[0].body).not.toHaveProperty('usedCount')
})
test('edit preserves timestamp precision, activation and code of used promotion', async ({ page }) => {
  const state = await setup(page, { used: 2 })
  await page.goto('/admin/promotions')
  await menu(page, 'Edit promotion')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Promotion code', { exact: true })).toHaveAttribute('readonly', '')
  await dialog.getByLabel('Description', { exact: true }).fill('Updated terms')
  await dialog.getByRole('button', { name: 'Save promotion', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body).toMatchObject({ description: 'Updated terms', startAt: '2026-11-01T00:00:45Z', isActive: true })
})
test('toggle and delete require confirmation, toast and refresh data', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/promotions')
  await menu(page, 'Deactivate promotion')
  let dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('table')).toContainText('Inactive')
  await expect(page.getByText('Promotion availability updated.', { exact: true })).toBeVisible()
  await menu(page, 'Delete promotion')
  dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes.map(row => row.method)).toEqual(['PUT', 'DELETE'])
})
test('stale records block mutation and uncertain toggle cannot be repeated', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/promotions')
  await menu(page, 'Deactivate promotion')
  let dialog = page.getByRole('dialog')
  await expect(dialog.getByText('SAVE20', { exact: true })).toBeVisible()
  state.stale = true
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Data changed')
  expect(state.writes).toHaveLength(0)
  state.stale = false; state.unknown = true
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await menu(page, 'Deactivate promotion')
  dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('uncertain')
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
})
test('details render usage statistics and download a real CSV response', async ({ page }) => {
  await setup(page)
  await page.goto(`/admin/promotions?promotion=${id}`)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Nov 1, 2026, 7:00 AM')
  await dialog.getByRole('tab', { name: 'Usage statistics', exact: true }).click()
  await expect(dialog.getByRole('table', { name: 'Daily usage' })).toContainText('08/11/2026')
  await expect(dialog.getByText('Paid order value', { exact: true })).toBeVisible()
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Export CSV', exact: true }).click()
  expect((await download).suggestedFilename()).toBe(`promotion-${id}-statistics.csv`)
})
test('dark mobile has contained horizontal table scrolling and a usable editor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page, { dark: true })
  await page.goto('/admin/promotions')
  await expect(page.getByRole('table')).toContainText('SAVE20')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Add promotion', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Promotion code', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('bulk selection opens a preview for all three actions without single-record mutations', async ({ page }) => {
  const state = await setup(page, { used: 2 })
  await page.goto('/admin/promotions')
  await page.getByRole('checkbox', { name: 'Select all promotions on this page' }).check()
  await page.getByRole('button', { name: 'Bulk actions', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('list', { name: 'Selected promotions' })).toContainText('SAVE20')
  await expect(dialog).not.toContainText('server must recheck eligibility')
  await expect(dialog.getByRole('button', { name: 'Deactivate promotion', exact: true })).toBeEnabled()
  await dialog.getByRole('tab', { name: 'Activate promotion', exact: true }).click()
  await expect(dialog.getByText(/Skipped:/)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Activate promotion', exact: true })).toBeEnabled()
  await dialog.getByRole('tab', { name: 'Delete promotion', exact: true }).click()
  await expect(dialog.getByText(/Skipped:/)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Delete promotion', exact: true })).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Status', exact: true }).click()
  await page.getByRole('option', { name: 'Inactive', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bulk actions', exact: true })).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
  expect(state.reads).toBe(0)
})

test('shared modal opens with reduced motion and restores keyboard focus when closed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await setup(page)
  await page.goto('/admin/promotions')
  const trigger = page.getByRole('button', { name: 'Add promotion', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Close', exact: true }).first()).toBeFocused()
  await expect(dialog).toHaveCSS('opacity', '1')
  await expect(dialog).toHaveCSS('transform', 'none')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(dialog.getByLabel('Promotion code', { exact: true })).toBeVisible()
})

test('backend sync: promotion usage history pages through orders and exposes reversal reasons', async ({ page }) => {
  const state = await setup(page)
  state.usages = Array.from({ length: 12 }, (_, index) => ({ id: `a1111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`, orderId: `b1111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`, orderCode: `ORDER-${index + 1}`, customerName: 'Test Customer', discountAmount: 10000, orderAmount: 50000, usedAt: '2026-11-08T00:00:00Z', isReverted: index === 11, revertedAt: index === 11 ? '2026-11-09T00:00:00Z' : null, revertReason: index === 11 ? 'Customer cancelled the order' : null }))
  await page.goto(`/admin/promotions?promotion=${id}`)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: 'Promotion usage history', exact: true }).click()
  await expect(dialog.getByRole('link', { name: 'ORDER-10', exact: true })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'ORDER-11', exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(dialog.getByRole('link', { name: 'ORDER-12', exact: true })).toBeVisible()
  await expect(dialog.getByText(/Customer cancelled the order/)).toBeVisible()
  expect(state.writes).toHaveLength(0)
})


test('promotion detail separates three keyboard-accessible tabs with readable eligibility on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, { dark: true })
  await page.goto(`/admin/promotions?promotion=${id}`)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('tab')).toHaveCount(3)
  const eligibility = dialog.getByRole('tab', { name: 'Eligibility', exact: true })
  await expect(eligibility).toHaveAttribute('aria-selected', 'true')
  expect(await dialog.locator('dt').first().evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')
  expect(await dialog.locator('dd').first().evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')
  await expect(dialog.getByRole('table', { name: 'Daily usage' })).toHaveCount(0)
  await eligibility.focus()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('tab', { name: 'Usage statistics', exact: true })).toBeFocused()
  await expect(dialog.getByRole('table', { name: 'Daily usage' })).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Eligibility', exact: true })).toHaveCount(0)
  await page.keyboard.press('End')
  await expect(dialog.getByRole('tab', { name: 'Promotion usage history', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(dialog.getByRole('table', { name: 'Daily usage' })).toHaveCount(0)
  await page.keyboard.press('Home')
  await expect(eligibility).toBeFocused()
  await expect(dialog.locator('dt').first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(state.writes).toHaveLength(0)
})
