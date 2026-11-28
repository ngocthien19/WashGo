import { expectFixedDialog } from '../helpers/dialogLayout'
import { expect, test } from '@playwright/test'
import { setupAdminMerchants as setup, merchantId, requestId } from '../helpers/adminMerchantSession'

const menu = async (page, action, name = 'Ben Thanh Laundry') => {
  await page.getByRole('button', { name: `Actions for ${name}`, exact: true }).click()
  await page.getByRole('menuitem', { name: action, exact: true }).click()
}
async function fillCreate(page) {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Open 24/7', { exact: true }).check()
  await dialog.getByLabel('Business name', { exact: true }).fill('New Laundry')
  await dialog.getByLabel('Sign-in email', { exact: true }).fill('new@example.test')
  await dialog.getByLabel('Phone number', { exact: true }).fill('0901234567')
  await dialog.getByRole('tab', { name: 'Location & service area', exact: true }).click()
  for (const [label, value] of [['Store address', '456 Test Street'], ['City / Province', 'Ho Chi Minh City'], ['Latitude', '10.78'], ['Longitude', '106.71']]) {
    await dialog.getByLabel(label, { exact: true }).fill(value)
  }
  return dialog
}

test('daily opening hours save all seven days while custom controls stay collapsed', async ({ page }) => {
  const state = await setup(page)
  state.merchants[0].openingSchedule = null
  await page.goto('/admin/merchants')
  await menu(page, 'Edit merchant')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Monday', { exact: true })).not.toBeVisible()
  await dialog.getByLabel('Opening time', { exact: true }).fill('08:00')
  await dialog.getByLabel('Closing time', { exact: true }).fill('20:00')
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body.openingSchedule).toEqual({ timeZone: 'Asia/Ho_Chi_Minh', alwaysOpen: false, weekly: Array.from({ length: 7 }, (_, index) => ({ dayOfWeek: index + 1, shifts: [{ open: '08:00', close: '20:00' }] })), closedDates: [] })
})

test('existing custom hours and holidays remain intact when editing merchant information', async ({ page }) => {
  const state = await setup(page)
  const schedule = { timeZone: 'Asia/Ho_Chi_Minh', alwaysOpen: false, weekly: [{ dayOfWeek: 1, shifts: [{ open: '08:00', close: '12:00' }, { open: '13:00', close: '20:00' }] }], closedDates: ['2026-12-25'] }
  state.merchants[0].openingSchedule = schedule
  await page.goto('/admin/merchants')
  await menu(page, 'Edit merchant')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Monday Opening time 1')).toHaveValue('08:00')
  await expect(dialog.getByLabel('Monday Opening time 2')).toHaveValue('13:00')
  await expect(dialog.getByRole('textbox', { name: 'Special closed dates (YYYY-MM-DD, one per line)', exact: true })).toHaveValue('2026-12-25')
  await dialog.getByLabel('Business name', { exact: true }).fill('Updated Laundry')
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body.openingSchedule).toEqual(schedule)
})

test('a legacy Merchant must supply a valid structured opening schedule before saving', async ({ page }) => {
  const state = await setup(page)
  state.merchants[0].openingSchedule = null
  await page.goto('/admin/merchants')
  await menu(page, 'Edit merchant')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Business name', { exact: true }).fill('Updated Laundry')
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  await expect(dialog.getByText(/Select at least one open day/)).toBeVisible()
  expect(state.writes).toHaveLength(0)
  await dialog.getByText('Different hours by day', { exact: true }).click()
  await dialog.getByLabel('Monday', { exact: true }).check()
  await dialog.getByLabel('Monday Opening time 1').fill('08:00')
  await dialog.getByLabel('Monday Closing time 1').fill('20:00')
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body.openingSchedule).toEqual({ timeZone: 'Asia/Ho_Chi_Minh', alwaysOpen: false, weekly: [{ dayOfWeek: 1, shifts: [{ open: '08:00', close: '20:00' }] }], closedDates: [] })
})

test('a rejected service radius change shows affected lockers and retains the entered value', async ({ page }) => {
  await setup(page)
  let attempts = 0
  await page.route('**/api/merchant', async route => {
    if (route.request().method() !== 'PUT') {
      return route.fallback()
    }
    attempts++
    return route.fulfill({ status: 409, json: { succeeded: false, message: 'Coverage would exclude assigned lockers.', meta: { code: 'MerchantCoverageWouldExcludeLockers', lockers: [{ lockerId: '50000000-0000-4000-8000-000000000001', code: 'LK-TEST', name: 'Affected Locker', distanceKm: 3, serviceRadiusKm: 1 }] } } })
  })
  await page.goto('/admin/merchants')
  await menu(page, 'Edit merchant')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: 'Location & service area', exact: true }).click()
  await dialog.getByLabel('Service radius (km)', { exact: true }).fill('1')
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  await expect(dialog.getByText(/LK-TEST/)).toBeVisible()
  await expect(dialog.getByLabel('Service radius (km)', { exact: true })).toHaveValue('1')
  expect(attempts).toBe(1)
})

test('backend sync: Admin uploads a private Merchant license and preserves version and other documents', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/merchants')
  await menu(page, 'Edit merchant')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Choose document', { exact: true }).first().setInputFiles({ name: 'license.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nMock license\n%%EOF') })
  await expect(dialog.getByText('license.pdf', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0].body).toMatchObject({ id: merchantId, businessLicenseDocumentId: state.documents[0].fileId, removeBusinessLicenseDocument: false, expectedVersion: 'version-1', operationId: expect.any(String), serviceAreaIds: null })
  expect(state.writes[0].body).not.toHaveProperty('contractDocumentId')
  expect(state.writes[0].body).not.toHaveProperty('slaDocumentId')
})
test('merchant totals remain global while URL filters and paging apply on the server', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/merchants?page=2')
  await expect(page.getByText('Laundry 13', { exact: true })).toBeVisible({ timeout: 20000 })
  await page.reload()
  await expect(page.getByText('Laundry 13', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Status', exact: true }).click()
  await page.getByRole('option', { name: 'Suspended', exact: true }).click()
  await expect(page).toHaveURL(/state=3/)
  await expect(page.getByText('Laundry 02', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Total merchants', exact: true }).locator('..')).toContainText('13')
  await expect(page.getByText('Laundry 13', { exact: true })).toHaveCount(0)
  expect(state.calls.filter((call) => call.path === '/merchant/filter' && call.body.take === 12).at(-1).body).toEqual({ page: 1, take: 12, status: 3 })
  expect(state.writes).toHaveLength(0)
})
test('city options remain global and all three filters align on desktop', async ({ page }) => {
  const state = await setup(page)
  state.merchants[12].city = 'Da Nang'
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/admin/merchants?state=3')
  const city = page.getByRole('combobox', { name: 'City / Province', exact: true })
  await expect(city).toBeEnabled()
  const searchBox = await page.getByRole('search').boundingBox()
  const statusBox = await page.getByRole('combobox', { name: 'Status', exact: true }).boundingBox()
  const cityBox = await city.boundingBox()
  expect(Math.abs(searchBox.y - statusBox.y)).toBeLessThan(2)
  expect(Math.abs(searchBox.y - cityBox.y)).toBeLessThan(2)
  await city.click()
  await page.getByRole('option', { name: 'Da Nang', exact: true }).click()
  await expect(page).toHaveURL(/city=Da\+Nang/)
  await expect(page.getByText('No matching results.', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Status', exact: true }).click()
  await page.getByRole('option', { name: 'All', exact: true }).click()
  await expect(page.getByText('Laundry 13', { exact: true })).toBeVisible()
  expect(state.calls.filter((call) => call.path === '/merchant/filter' && call.body.take === 12).at(-1).body).toMatchObject({ city: 'Da Nang' })
})

test('edit preserves service area assignments and omits status, actor and credentials', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/merchants')
  await menu(page, 'Edit merchant')
  const dialog = page.getByRole('dialog', { name: 'Edit merchant', exact: true })
  await dialog.getByLabel('Business name', { exact: true }).fill('Renamed Laundry')
  await dialog.getByRole('tab', { name: 'Contract & SLA', exact: true }).click()
  await expect(dialog.getByLabel('Contract start date', { exact: true })).toHaveValue('2026-11-01')
  await dialog.getByLabel('Platform commission (%)', { exact: true }).fill('0')
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Renamed Laundry', { exact: true })).toBeVisible()
  const body = state.writes[0].body
  expect(body).toMatchObject({ id: merchantId, serviceAreaIds: null, commissionRate: 0, contractStartDate: '2026-10-31T17:00:00Z' })
  for (const key of ['status', 'approvedBy', 'password', 'role']) {
    expect(body).not.toHaveProperty(key)
  }
})
test('creating requires a valid location and supports store photo upload', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/merchants')
  await page.getByRole('button', { name: 'Add merchant', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  dialog = await fillCreate(page)
  await dialog.getByRole('tab', { name: 'Basic information', exact: true }).click()
  await dialog.getByLabel('Add photos', { exact: true }).setInputFiles({ name: 'store.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCGsAAAAASUVORK5CYII=', 'base64') })
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.uploads).toBe(1)
  expect(state.writes[0].body).toMatchObject({ businessName: 'New Laundry', latitude: 10.78, longitude: 106.71, commissionRate: null, imageUrls: ['/uploads/mock/store.png'] })
})
test('lock requires a reason and explicit unfinished-order confirmation, then offers unlock', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/merchants')
  await menu(page, 'Lock account')
  let dialog = page.getByRole('dialog')
  const confirm = dialog.getByRole('button', { name: 'Confirm update', exact: true })
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('textbox').fill('Operational review')
  await expect(confirm).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await confirm.click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body).toMatchObject({ merchantId, status: 3, rejectionReason: 'Operational review', confirm: true })
  await menu(page, 'Unlock account')
  dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(2)
  expect(state.writes[1].body).toMatchObject({ merchantId, status: 1, confirm: false })
})
test('unknown creation blocks resubmission and a lock conflict never retries automatically', async ({ page }) => {
  const state = await setup(page)
  state.createUnknown = true
  await page.goto('/admin/merchants')
  await page.getByRole('button', { name: 'Add merchant', exact: true }).click()
  let dialog = await fillCreate(page)
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('outcome is unknown')
  await expect(dialog.getByRole('button', { name: 'Save information', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
  await dialog.getByText('Close', { exact: true }).click()
  state.lockConflict = true
  await menu(page, 'Lock account')
  dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('Review')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('unfinished orders have changed')
  await expect(dialog.getByRole('button', { name: 'Confirm update', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(2)
})
test('stale edit data is rejected before any write', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/merchants')
  await menu(page, 'Edit merchant')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Business name', { exact: true }).fill('Do not overwrite')
  state.changeBeforeSave = true
  await dialog.getByRole('button', { name: 'Save information', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('data has changed')
  expect(state.writes).toHaveLength(0)
})
test('profile requests show snapshots and approve with the current Merchant guarded', async ({ page }) => {
  const state = await setup(page)
  state.requests[0].current.openingSchedule = null
  state.requests[0].current.baseMerchantVersion = 'legacy-profile-v1'
  state.merchants[0].version = 'legacy-profile-v1'
  await page.goto(`/admin/merchants?tab=requests&request=${requestId}`)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Updated Ben Thanh Laundry', { exact: true })).toBeVisible({ timeout: 20000 })
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page).not.toHaveURL(/request=/)
  expect(state.writes[0].path).toMatch(/\/approve$/)
  expect(state.requests[0].status).toBe(2)
})
test('approval cannot overwrite a changed profile and rejection requires a reason', async ({ page }) => {
  const state = await setup(page)
  state.merchants[0].address = 'Changed after submission'
  await page.goto('/admin/merchants?tab=requests')
  await menu(page, 'View details')
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('differs from the submitted snapshot')
  expect(state.writes).toHaveLength(0)
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Reject', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Confirm rejection', exact: true })).toBeDisabled()
  await dialog.getByRole('textbox').fill('Please resubmit against the current profile')
  await dialog.getByRole('button', { name: 'Confirm rejection', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body).toMatchObject({ reason: 'Please resubmit against the current profile' })
})

test('a captured null schedule is a real conflict and a legacy request without a version remains rejectable', async ({ page }) => {
  const state = await setup(page)
  state.requests[0].current.openingSchedule = null
  state.requests[0].current.openingScheduleSnapshotIncluded = true
  await page.goto(`/admin/merchants?tab=requests&request=${requestId}`)
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
  state.requests[0].current.openingScheduleSnapshotIncluded = false
  await page.reload()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Reject', exact: true }).click()
  await dialog.getByRole('textbox').fill('Historical schedule and base version were not captured; submit a new request.')
  await dialog.getByRole('button', { name: 'Confirm rejection', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0].path).toMatch(/\/reject$/)
})
test('mobile dark table keeps actions sticky and a list failure can retry', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const state = await setup(page, { dark: true })
  state.listError = true
  await page.goto('/admin/merchants')
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
  state.listError = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('Ben Thanh Laundry', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('region', { name: 'Merchant list', exact: true }).evaluate((element) => {
    element.scrollLeft = element.scrollWidth
  })
  await menu(page, 'View details')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('GP-001', { exact: true })).toBeVisible()
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  expect(state.writes).toHaveLength(0)
})


test('Merchant region and detail fields use readable text and blue section headers', async ({ page }) => {
  await setup(page)
  await page.goto('/admin/merchants')
  const row = page.getByRole('row').filter({ hasText: 'Ben Thanh Laundry' })
  const area = row.locator('td').nth(1)
  for (const text of await area.locator('p').all()) {
    expect(await text.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')
  }
  await menu(page, 'View details')
  const dialog = page.getByRole('dialog')
  const label = dialog.locator('dt').first(), value = dialog.locator('dd').first()
  expect(await label.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')
  expect(await value.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px')
  await expect(dialog.getByRole('heading', { name: 'Contact information', exact: true })).toHaveClass(/bg-primary\/5/)
  await expect(dialog.getByRole('heading', { name: 'Contact information', exact: true }).locator('span')).toHaveClass(/text-primary/)
})


test('workspace typography and plain Merchant name link open a bounded detail modal', async ({ page }) => {
  await setup(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 650 })
  await page.goto('/admin/merchants')
  await expect(page.locator('main h1')).toHaveCSS('font-size', '30px')
  await expect(page.locator('main h1 + p')).toHaveCSS('font-size', '16px')
  const link = page.getByRole('button', { name: 'Ben Thanh Laundry', exact: true })
  await expect(link).toHaveCSS('cursor', 'pointer')
  await expect(link).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await link.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Contact information', exact: true })).toBeVisible()
  await expectFixedDialog(dialog)
  if (process.env.WORKSPACE_QA) {
    await page.screenshot({ path: 'test-results/workspace-admin-dialog.png' })
  }
})

test('closing a linked profile request preserves the list without reloading', async ({ page }) => {
  await setup(page)
  await page.goto(`/admin/merchants?tab=requests&request=${requestId}`)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Updated Ben Thanh Laundry', { exact: true })).toBeVisible()
  const requests = []
  const capture = request => {
    if (request.url().includes('/api/') && request.method() !== 'OPTIONS') {
      requests.push(request.url())
    }
  }
  page.on('request', capture)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await expect(dialog).toHaveCount(0)
  await expect(page).not.toHaveURL(/request=/)
  await page.waitForTimeout(350)
  page.off('request', capture)
  expect(requests).toEqual([])
})
