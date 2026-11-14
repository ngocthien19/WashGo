import { adminUpgradeMocks } from '../helpers/adminUpgradeMocks'
import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'
const id = 'a0000000-0000-4000-8000-000000000001', orderId = 'b0000000-0000-4000-8000-000000000001', merchantId = 'c0000000-0000-4000-8000-000000000001', customerId = 'd0000000-0000-4000-8000-000000000001', messageId = 'e0000000-0000-4000-8000-000000000001'
async function setup(page, options = {}) {
  await merchantSession(page, { role: 'Admin', ...options })
  const incident = { id, orderId, merchantId, customerId, orderCode: 'WG26110801', customerName: 'Alex Customer', merchantName: 'Central Laundry', type: 1, severity: 2, status: options.status || 1, description: 'Jacket damaged after cleaning', imageUrls: ['/uploads/mock/evidence.svg'], videoUrls: [], createdOn: 1794099600, compensationLevel: 0, compensationStatus: 0, compensationAmount: 0, itemValue: 0, customerUpdatedAt: null, ...options.incident }
  const state = { incident, filters: [], writes: [], reads: 0, messages: [], unknown: false, stale: false, newEvidence: false, settingsChanged: false, settingsReads: 0 }
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, ''), body = /application\/json/.test(req.headers()['content-type'] || '') ? req.postDataJSON() : undefined
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    if (await adminUpgradeMocks(route, state, [{ id: merchantId, name: 'Central Laundry', status: 1 }])) {
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
    if (path === '/merchant/filter') {
      return route.fulfill({ json: { succeeded: true, list: [{ id: merchantId, businessName: 'Central Laundry', status: 1, email: 'merchant@example.test', phone: '0903000003', imageUrls: ['/uploads/mock/merchant.svg'] }], total: 1 } })
    }
    if (path === `/merchant/${merchantId}`) {
      return ok({ id: merchantId, businessName: 'Central Laundry', email: 'merchant@example.test', phone: '0903000003', imageUrls: ['/uploads/mock/merchant.svg'] })
    }
    if (path === `/wash-order/${orderId}`) {
      return ok({ id: orderId, customerId, customerPhoneNumber: '0901000001' })
    }
    if (path.startsWith('/uploads/mock/')) {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#aabbcc"/></svg>' })
    }
    if (path === '/incident/filter') {
      state.filters.push(body)
      const rows = body.status == null || body.status === incident.status ? [incident] : []
      return route.fulfill({ json: { succeeded: true, list: rows, total: rows.length } })
    }
    if (path === '/system-setting') {
      state.settingsReads++
      return ok({ version: 'settings-1', compensationLightPercent: 20, compensationMediumPercent: state.settingsChanged && state.settingsReads > 1 ? 65 : 60, compensationSeverePercent: 100, compensationLostPercent: 150 })
    }
    if (path === `/incident/${id}`) {
      state.reads++
      if ((state.stale || state.newEvidence) && state.reads > 1) {
        incident.customerUpdatedAt = '2026-11-08T12:00:00Z'; incident.version = 'version-2'
      }
      return ok(incident)
    }
    if (path === `/incident/${id}/messages` && req.method() === 'GET') {
      if (state.newEvidence) {
        state.messages = [{ id: messageId, incidentId: id, content: 'Additional photo', senderName: 'Alex Customer', senderRole: 'Customer', imageUrls: ['/uploads/mock/evidence.svg'], videoUrls: [], createdAt: '2026-11-08T00:00:00Z' }]
      }
      return ok(state.messages)
    }
    if (req.method() === 'POST') {
      state.writes.push({ path, body })
      if (state.unknown) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      if (path.endsWith('/resolve')) {
        Object.assign(incident, { ...body, status: 2, compensationAmount: Math.round(body.itemValue * (body.compensationLevel ? 60 : 0) / 100), compensationStatus: body.compensationLevel ? 1 : 0, reviewedAt: '2026-11-08T12:00:00Z' })
        return ok(incident)
      }
      if (path.endsWith('/reject')) {
        Object.assign(incident, { status: 3, resolutionNote: body.reason }); return ok(incident)
      }
      if (path.endsWith('/confirm-compensation')) {
        Object.assign(incident, { compensationStatus: 2, compensationReference: body.reference, compensationPaidAt: '2026-11-08T12:00:00Z' }); return ok(incident)
      }
      if (path.endsWith('/messages')) {
        const message = { ...body, id: messageId, incidentId: id, senderName: 'Test Admin', senderRole: 'Admin', isMine: true, createdAt: '2026-11-08T12:00:00Z' }
        state.messages.push(message); return ok(message)
      }
    }
    throw new Error(`Unexpected complaint API ${req.method()} ${path}`)
  })
  return state
}
async function menu(page, action) {
  await page.getByRole('button', { name: 'Complaint actions for WG26110801', exact: true }).click()
  await page.getByRole('menuitem', { name: action, exact: true }).click()
}
async function confirmed(dialog) {
  await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
}

test('Admin complaint filters use real enum/merchant/date parameters and keep summary global', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/complaints')
  await expect(page.getByRole('table')).toContainText('WG26110801')
  await page.getByRole('combobox', { name: 'Review status', exact: true }).click()
  await page.getByRole('option', { name: 'Withdrawn', exact: true }).click()
  await expect.poll(() => state.filters.filter(item => item.take === 12).at(-1)?.status).toBe(4)
  await page.getByLabel('From date', { exact: true }).fill('2026-11-08')
  await page.getByLabel('To date', { exact: true }).fill('2026-11-09')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect.poll(() => state.filters.filter(item => item.take === 12).at(-1)?.fromDate).toBe(Date.parse('2026-11-08T00:00:00+07:00') / 1000)
  expect(state.filters.filter(item => item.take === 1).every(item => item.fromDate == null && item.merchantId == null)).toBe(true)
  expect(state.writes).toHaveLength(0)
})
test('resolve reads current configured rates, validates and posts no client amount or actor', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/complaints')
  await menu(page, 'Resolve complaint')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  await dialog.getByLabel('Resolution', { exact: true }).fill('Verified damage and approved compensation')
  await dialog.getByRole('combobox', { name: 'Compensation level', exact: true }).click()
  await page.getByRole('option', { name: 'Moderate damage (60%)', exact: true }).click()
  await dialog.getByLabel('Confirmed item value', { exact: true }).fill('100000')
  await expect(dialog.getByText(/Estimated compensation:/)).toContainText('60,000')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body).toMatchObject({ resolutionNote: 'Verified damage and approved compensation', responsibleParty: null, compensationLevel: 2, itemValue: 100000 })
  await expect(page.getByText('Complaint resolved.', { exact: true })).toBeVisible()
})
test('reject requires a reason and a separate confirmation', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/complaints')
  await menu(page, 'Reject complaint')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  await dialog.getByLabel('Rejection reason', { exact: true }).fill('Photos do not show the reported issue')
  await confirmed(dialog)
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body).toMatchObject({ reason: 'Photos do not show the reported issue' })
})
test('manual payout needs an explicit transfer reference and does not call a payment gateway', async ({ page }) => {
  const state = await setup(page, { status: 2, incident: { compensationAmount: 60000, compensationStatus: 1, itemValue: 100000, compensationLevel: 2 } })
  await page.goto(`/admin/complaints/${id}`)
  await page.getByRole('button', { name: 'Record compensation payout', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Payout reference', { exact: true }).fill('BANK-123')
  await confirmed(dialog)
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Record compensation payout', exact: true })).toHaveCount(0)
  await expect(page.getByText('BANK-123', { exact: true })).toBeVisible()
  expect(state.writes.map(item => item.path)).toEqual([`/incident/${id}/confirm-compensation`])
})
test('detail shows evidence and lets Admin reply even after resolution', async ({ page }) => {
  const state = await setup(page, { status: 2, incident: { compensationPercentApplied: 60, compensationProofImageUrls: ['/uploads/mock/proof.svg'] } })
  await page.goto(`/admin/complaints/${id}`)
  const photo = page.locator('img[src$="evidence.svg"]')
  await expect(photo).toBeVisible()
  await expect(page.locator('img[src$="proof.svg"]')).toBeVisible()
  await expect(page.getByText('Applied compensation rate: 60%', { exact: true })).toBeVisible()
  await expect.poll(() => state.auditFilters?.at(-1)?.resourceId).toBe(id)
  expect(state.auditFilters.at(-1).resourceType).toBe('Incident')
  await expect(page.getByRole('link', { name: /Related order/ })).toHaveAttribute('href', `/admin/orders/${orderId}`)
  await page.getByLabel('Message', { exact: true }).fill('We have completed the review. Please check the outcome.')
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await expect(page.getByText('We have completed the review. Please check the outcome.', { exact: true })).toBeVisible()
  expect(state.writes[0].body).toMatchObject({ content: 'We have completed the review. Please check the outcome.', imageUrls: [], videoUrls: [] })
  await expect(page.getByRole('button', { name: 'Resolve complaint', exact: true })).toHaveCount(0)
})
test('new evidence or a changed complaint blocks review before mutation', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/complaints')
  await menu(page, 'Reject complaint')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Rejection reason', { exact: true }).fill('Review complete')
  state.newEvidence = true
  await confirmed(dialog)
  await expect(dialog.getByRole('alert')).toContainText('complaint changed')
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
})
test('changed compensation rates block resolution and unknown writes cannot be repeated', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/complaints')
  await menu(page, 'Resolve complaint')
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Resolution', { exact: true }).fill('Approve compensation')
  await dialog.getByRole('combobox', { name: 'Compensation level', exact: true }).click()
  await page.getByRole('option', { name: 'Moderate damage (60%)', exact: true }).click()
  await dialog.getByLabel('Confirmed item value', { exact: true }).fill('100000')
  state.settingsChanged = true
  await confirmed(dialog)
  await expect(dialog.getByRole('alert')).toContainText('settings changed')
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await menu(page, 'Reject complaint')
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Rejection reason', { exact: true }).fill('Not enough evidence')
  state.unknown = true
  await confirmed(dialog)
  await expect(dialog.getByRole('alert')).toContainText('uncertain')
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
})
test('withdrawn complaints have no review actions and mobile dark stays within viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setup(page, { dark: true, status: 4, incident: { withdrawReason: 'No longer needed', withdrawnAt: '2026-11-08T12:00:00Z' } })
  await page.goto(`/admin/complaints/${id}`)
  await expect(page.getByText('No longer needed', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resolve complaint', exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto('/admin/complaints')
  await expect(page.getByRole('table')).toContainText('WG26110801')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('complaint contacts appear in table, details and review dialogs, with semantic header colors', async ({ page }) => {
  await setup(page, { incident: { customerEmail: 'customer@example.test', customerPhoneNumber: '0901000001', customerAvatarUrl: '/uploads/mock/customer.svg', merchantEmail: 'merchant@example.test', merchantPhone: '0903000003', merchantImageUrls: ['/uploads/mock/merchant.svg'], contactBasis: 'Current profile, Admin only; not part of incident version.' } })
  await page.goto('/admin/complaints')
  const table = page.getByRole('table')
  await expect(table).toContainText('customer@example.test')
  await expect(table).toContainText('merchant@example.test')
  await expect(table).toContainText('0901000001')
  await expect(table).toContainText('0903000003')
  await expect(table.getByText('Pending review', { exact: true })).toHaveCSS('white-space', 'nowrap')
  await menu(page, 'Resolve complaint')
  let dialog = page.getByRole('dialog')
  await expect(dialog.getByText('customer@example.test', { exact: true })).toBeVisible()
  await expect(dialog.locator('img[src$="customer.svg"]')).toBeVisible()
  const infoColor = await dialog.locator('[data-dialog-header] h2 > svg').evaluate(element => getComputedStyle(element).color)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await menu(page, 'Reject complaint')
  dialog = page.getByRole('dialog')
  await expect(dialog.getByText('0901000001', { exact: true })).toBeVisible()
  await expect(dialog.locator('[data-dialog-header]')).toHaveAttribute('data-tone', 'danger')
  expect(await dialog.locator('[data-dialog-header] h2 > svg').evaluate(element => getComputedStyle(element).color)).not.toBe(infoColor)
  const closeIcon = dialog.getByRole('button', { name: 'Close', exact: true }).first()
  await expect(closeIcon).toBeVisible()
  await closeIcon.click()
  await expect(dialog).toHaveCount(0)
  await page.goto(`/admin/complaints/${id}`)
  await expect(page.getByText(id, { exact: false })).toHaveCount(0)
  await expect(page.getByText('customer@example.test', { exact: true })).toBeVisible()
  await expect(page.getByText('merchant@example.test', { exact: true })).toBeVisible()
  const back = page.getByRole('link', { name: 'Back to complaints', exact: true }), refresh = page.locator('main header').getByRole('button', { name: 'Refresh', exact: true })
  expect((await back.boundingBox()).x).toBeLessThan((await refresh.boundingBox()).x)
})

test('current BE contact gaps keep fallback UI and reuse authorized order/Merchant detail reads', async ({ page }) => {
  await setup(page)
  await page.goto(`/admin/complaints/${id}`)
  await expect(page.getByText('0901000001', { exact: true })).toBeVisible()
  await expect(page.getByText('merchant@example.test', { exact: true })).toBeVisible()
  await expect(page.locator('img[src$="merchant.svg"]')).toBeVisible()
  await page.getByRole('button', { name: 'Reject complaint', exact: true }).click()
  await expect(page.getByRole('dialog').getByText('0901000001', { exact: true })).toBeVisible()
})

test('backend sync: complaint messages paginate at the server without loading the full thread', async ({ page }) => {
  const state = await setup(page)
  state.messages = Array.from({ length: 12 }, (_, index) => ({ id: `a1111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`, incidentId: id, content: `Evidence message ${index + 1}`, senderName: 'Alex Customer', senderRole: 'Customer', imageUrls: [], videoUrls: [], createdAt: '2026-11-08T00:00:00Z' }))
  await page.goto(`/admin/complaints/${id}`)
  await expect(page.getByText('Evidence message 10', { exact: true })).toBeVisible()
  await expect(page.getByText('Evidence message 11', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(page.getByText('Evidence message 12', { exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(0)
})


test('complaint detail places evidence and resolution on the right with a full-width scoped activity log', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 })
  const state = await setup(page)
  await page.goto(`/admin/complaints/${id}`)
  const report = page.getByRole('heading', { name: 'Complaint report', exact: true }).locator('..')
  const evidence = page.getByRole('heading', { name: 'Evidence', exact: true }).locator('..')
  const resolution = page.getByRole('heading', { name: 'Resolution', exact: true }).locator('..')
  const audit = page.getByRole('heading', { name: 'Activity log', exact: true }).locator('../..')
  await expect(report.getByRole('heading', { name: 'Describe the issue', exact: true })).toBeVisible()
  expect(await report.getByText('Jacket damaged after cleaning', { exact: true }).evaluate(el => getComputedStyle(el).fontSize)).toBe('18px')
  const left = await report.boundingBox(), right = await evidence.boundingBox(), result = await resolution.boundingBox(), log = await audit.boundingBox()
  expect(right.x).toBeGreaterThan(left.x + left.width)
  expect(result.x).toBeCloseTo(right.x, 0)
  expect(log.x).toBeCloseTo(left.x, 0)
  expect(log.width).toBeGreaterThan(left.width * 1.4)
  await audit.getByRole('combobox', { name: 'Result', exact: true }).click()
  await page.getByRole('option', { name: 'Failed', exact: true }).click()
  await expect.poll(() => state.auditFilters.at(-1).result).toBe(2)
  expect(state.auditFilters.at(-1)).toMatchObject({ resourceType: 'Incident', resourceId: id, page: 1 })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(audit.getByRole('combobox', { name: 'Result', exact: true })).toContainText('Failed')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(state.writes).toHaveLength(0)
})
