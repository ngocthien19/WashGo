import { expect, test } from '@playwright/test'
import { merchantSession } from './helpers/merchantSession'
import { systemSettingsFixture } from '../../src/test/fixtures/systemSettings'

async function setup(page, options = {}) {
  await merchantSession(page, { role: 'Admin', ...options })
  const state = { value: systemSettingsFixture(), reads: 0, writes: [], fail: false, unknown: false, stale: false }
  await page.route('**/api/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^\/api/, '')
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    if (path === '/auth/me') {
      return ok({ id: 'admin-test', fullName: 'Test Admin', role: 'Admin' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: {} })
    }
    if (path === '/system-setting' && request.method() === 'GET') {
      state.reads++
      if (state.fail) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      if (state.stale && state.reads > 1) {
        state.value.depositWindowMinutes = 45
      }
      return ok(state.value)
    }
    if (path.startsWith('/system-setting/') && request.method() === 'PUT') {
      const body = request.postDataJSON()
      state.writes.push({ path, body })
      if (state.unknown) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      Object.assign(state.value, body, { updatedAt: '2026-11-08T08:00:00Z' }); return ok(state.value)
    }
    throw new Error(`Unexpected setting API ${request.method()} ${path}`)
  })
  return state
}
async function review(page) {
  await page.getByRole('button', { name: 'Review & save', exact: true }).click()
  return page.getByRole('dialog')
}
async function confirm(dialog) {
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm save', exact: true }).click()
}

test('settings show real values, units and fixed read-only storage threshold', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/settings')
  await expect(page.getByRole('heading', { name: 'System settings', exact: true })).toBeVisible()
  await expect(page.getByLabel('Customer deposit window', { exact: true })).toHaveValue('30')
  await expect(page.getByRole('complementary').last()).toContainText('72')
  await expect(page.getByRole('button', { name: 'Review & save', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
})
test('SLA preview closes using X, preserves draft, then writes only the four supported fields', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/settings')
  await page.getByLabel('Customer deposit window', { exact: true }).fill('60')
  let dialog = await review(page)
  await expect(dialog).toContainText('60 min')
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).first().click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByLabel('Customer deposit window', { exact: true })).toHaveValue('60')
  dialog = await review(page)
  await confirm(dialog)
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toEqual([{ path: '/system-setting/sla', body: { depositWindowMinutes: 60, merchantCollectSlaHours: 4, merchantReturnSlaHours: 24, freePickupHours: 24 } }])
  await expect(page.getByText('System settings updated.', { exact: true })).toBeVisible()
})
test('invalid SLA and empty values do not open confirmation or write', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/settings')
  await page.getByLabel('Customer deposit window', { exact: true }).fill('4')
  await page.getByRole('button', { name: 'Review & save', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('between')
  await page.getByLabel('Customer deposit window', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Review & save', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})
test('zero default commission is accepted and leaves existing SLA and fees out of payload', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/settings')
  await page.getByRole('tab', { name: 'Default commission', exact: true }).click()
  await expect(page.getByText(/Existing Merchant rates remain separate/)).toBeVisible()
  await page.getByLabel('Default commission rate', { exact: true }).fill('0')
  const dialog = await review(page)
  await confirm(dialog)
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0]).toEqual({ path: '/system-setting/commission', body: { defaultCommissionRate: 0 } })
})
test('penalty validates compensation order and preserves the other ten command fields', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/settings')
  await page.getByRole('tab', { name: 'Fees & compensation', exact: true }).click()
  await page.getByLabel('Medium damage', { exact: true }).fill('10')
  await page.getByRole('button', { name: 'Review & save', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Compensation must be ordered')
  await page.getByLabel('Medium damage', { exact: true }).fill('80')
  const dialog = await review(page)
  await confirm(dialog)
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].path).toBe('/system-setting/penalty')
  expect(Object.keys(state.writes[0].body)).toHaveLength(11)
  expect(state.writes[0].body).toMatchObject({ compensationMediumPercent: 80, overdueFeeDay1: 10000, storageFeePerDay: 100000, cancelCollectedPercent: 50 })
})
test('fresh settings changed by another admin block the write', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/settings')
  await page.getByLabel('Customer deposit window', { exact: true }).fill('60')
  const dialog = await review(page)
  state.stale = true
  await confirm(dialog)
  await expect(dialog.getByRole('alert')).toContainText('Settings changed')
  await expect(dialog.getByRole('button', { name: 'Confirm save', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
})
test('unknown write result prevents repeat submission and refresh permits explicit reconciliation', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/settings')
  await page.getByLabel('Customer deposit window', { exact: true }).fill('60')
  const dialog = await review(page)
  state.unknown = true
  await confirm(dialog)
  await expect(dialog.getByRole('alert')).toContainText('save result is unknown')
  await expect(dialog.getByRole('button', { name: 'Confirm save', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Close', exact: true }).first().click()
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(page.getByLabel('Customer deposit window', { exact: true })).toHaveValue('30')
})
test('dirty tab switching requires explicit discard and undo restores loaded values', async ({ page }) => {
  await setup(page)
  await page.goto('/admin/settings')
  await page.getByLabel('Customer deposit window', { exact: true }).fill('60')
  await page.getByRole('button', { name: 'Undo changes', exact: true }).click()
  await expect(page.getByLabel('Customer deposit window', { exact: true })).toHaveValue('30')
  await page.getByLabel('Customer deposit window', { exact: true }).fill('60')
  await page.getByRole('tab', { name: 'Default commission', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Discard unsaved changes?')
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(page.getByLabel('Default commission rate', { exact: true })).toHaveValue('20')
})
test('settings failure retries and mobile dark penalty form fits without horizontal overflow', async ({ page }) => {
  const state = await setup(page, { dark: true })
  state.fail = true
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/settings')
  await expect(page.getByRole('alert')).toBeVisible()
  state.fail = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await page.getByRole('tab', { name: 'Fees & compensation', exact: true }).click()
  await expect(page.getByLabel('Storage fee per day', { exact: true })).toHaveValue('100000')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('guest cannot open the Admin settings page or read configuration', async ({ page }) => {
  let reads = 0
  await page.route('**/api/system-setting**', route => {
    reads++; return route.abort()
  })
  await page.goto('/admin/settings')
  await expect(page).toHaveURL(/\/login/)
  expect(reads).toBe(0)
})
