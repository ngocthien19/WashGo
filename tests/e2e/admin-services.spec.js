import { expect, test } from '@playwright/test'
import { merchantSession } from './helpers/merchantSession'
const id = 'a0000000-0000-4000-8000-000000000001', proposalId = 'b0000000-0000-4000-8000-000000000001', merchantId = 'c0000000-0000-4000-8000-000000000001'
async function setup(page, options = {}) {
  await merchantSession(page, { role: 'Admin', ...options })
  const service = { id, merchantId, code: 'SVC_TEST', name: 'Everyday wash', description: 'Careful cleaning', unitPrice: 50000, pricePerKg: null, pricePerItem: null, estimatedDurationHours: 24, serviceType: 1, unit: 'kg', isActive: true, approvalStatus: 2, imageUrls: [] }
  const state = { service, proposal: { id: proposalId, merchantId, merchantName: 'Central Laundry', serviceId: id, requestType: 2, status: 1, current: { ...service }, proposed: { ...service, name: 'Premium wash', unitPrice: 60000 }, reason: 'Improve service', createdAt: '2026-11-08T00:00:00Z' }, filters: [], writes: [], stale: false, unknown: false, reads: 0, removed: false }
  await page.route('**/api/**', route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, ''), body = /application\/json/.test(req.headers()['content-type'] || '') ? req.postDataJSON() : undefined
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    const list = (rows, total = rows.length) => route.fulfill({ json: { succeeded: true, list: rows, total, currentPage: body.page } })
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
      return list([{ id: merchantId, businessName: 'Central Laundry', status: 1, imageUrls: ['/uploads/mock/merchant.svg'] }])
    }
    if (path === '/uploads/mock/merchant.svg') {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#abc"/></svg>' })
    }
    if (path === '/wash-service/filter') {
      state.filters.push(body)
      const rows = !state.removed && (body.isActive == null || body.isActive === service.isActive) ? [service] : []
      return list(body.take === 1 ? [] : rows, rows.length)
    }
    if (path === '/service-proposal/filter') {
      return list(body.take === 1 ? [] : [state.proposal], body.status && body.status !== state.proposal.status ? 0 : 1)
    }
    if (path === `/wash-service/${id}` && req.method() === 'GET') {
      if (state.holdRead) {
        return new Promise(resolve => {
          state.releaseRead = () => resolve(ok(service))
        })
      }
      state.reads++; if (state.stale && state.reads > 1) {
        service.unitPrice = 70000
      }
      return ok(service)
    }
    if (path === `/service-proposal/${proposalId}` && req.method() === 'GET') {
      return ok(state.proposal)
    }
    if (['POST', 'PUT', 'DELETE'].includes(req.method())) {
      state.writes.push({ path, body })
      if (state.unknown) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      if (path === '/wash-service') {
        Object.assign(service, body); return ok(service)
      }
      if (path === '/wash-service/status') {
        service.isActive = body.isActive; return ok(service)
      }
      if (path === `/wash-service/${id}`) {
        state.removed = true; return ok(true)
      }
      if (path === `/service-proposal/${proposalId}/approve`) {
        state.proposal.status = 2; Object.assign(service, state.proposal.proposed); return ok(state.proposal)
      }
      if (path === `/service-proposal/${proposalId}/reject`) {
        state.proposal.status = 3; state.proposal.rejectionReason = body.reason; return ok(state.proposal)
      }
    }
    throw new Error(`Unexpected service API ${path}`)
  })
  return state
}
async function menu(page, action) {
  await page.getByRole('button', { name: 'Actions for Everyday wash', exact: true }).click()
  await page.getByRole('menuitem', { name: action, exact: true }).click()
}

test('service details animate once after data is ready instead of showing a loading popup', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services')
  state.holdRead = true
  await menu(page, 'Service details')
  await expect.poll(() => typeof state.releaseRead).toBe('function')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  state.releaseRead()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Everyday wash', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('status')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})

test('Admin catalog filters false availability on the server and summary stays global', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services')
  await expect(page.getByRole('table')).toContainText('Everyday wash')
  await page.getByRole('combobox', { name: 'Availability', exact: true }).click()
  await page.getByRole('option', { name: 'Inactive', exact: true }).click()
  await expect(page).toHaveURL(/state=false/)
  await expect.poll(() => state.filters.filter(row => row.take === 12).at(-1)?.isActive).toBe(false)
  expect(state.writes).toHaveLength(0)
})

test('Admin creates and edits supported service fields without unsupported photo or approval writes', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services')
  await page.getByRole('button', { name: 'Add service', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Save service', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  for (const [label, value] of [['Service code', 'SVC_TEST'], ['Service name', 'Everyday wash'], ['Base price (VND)', '50000']]) {
    await dialog.getByLabel(label, { exact: true }).fill(value)
  }
  await dialog.getByRole('button', { name: 'Save service', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await menu(page, 'Edit service')
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Base price (VND)', { exact: true }).fill('55000')
  await dialog.getByRole('button', { name: 'Save service', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[1].body).toMatchObject({ id, unitPrice: 55000, merchantId: null, isActive: true })
  expect(state.writes[1].body).not.toHaveProperty('imageUrls')
  expect(state.writes[1].body).not.toHaveProperty('approvalStatus')
})

test('Admin pauses and deletes with confirmation and retains approval status', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services')
  await menu(page, 'Pause service')
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body).toEqual({ serviceId: id, approvalStatus: 2, isActive: false })
  await menu(page, 'Delete service')
  dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.removed).toBe(true)
})

test('proposal detail compares snapshots and rejects with a required reason', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/admin/services?tab=proposals&proposal=${proposalId}`)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Premium wash', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Everyday wash', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Reject', exact: true }).click()
  await dialog.getByRole('checkbox').check()
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  await dialog.getByLabel('Rejection reason', { exact: true }).fill('Please clarify the pricing')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0]).toEqual({ path: `/service-proposal/${proposalId}/reject`, body: { reason: 'Please clarify the pricing' } })
  await expect(page).not.toHaveURL(/proposal=/)
})

test('proposal approval applies once and reviewed requests have no review actions', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/admin/services?tab=proposals&proposal=${proposalId}`)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  await page.goto(`/admin/services?tab=proposals&proposal=${proposalId}`)
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0)
})

test('stale edits never write and unknown responses block a repeated submission', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services')
  await menu(page, 'Edit service')
  let dialog = page.getByRole('dialog')
  state.stale = true
  await dialog.getByRole('button', { name: 'Save service', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('data has changed')
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  state.stale = false
  await menu(page, 'Edit service')
  dialog = page.getByRole('dialog')
  state.unknown = true
  await dialog.getByRole('button', { name: 'Save service', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Save service', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('alert')).toContainText('outcome is unknown')
  expect(state.writes).toHaveLength(1)
})

test('mobile dark catalog keeps sticky actions and editor within the viewport', async ({ page }) => {
  await setup(page, { dark: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/services')
  const table = page.getByRole('table')
  await expect(table).toContainText('Everyday wash')
  expect(await table.locator('th').last().evaluate(el => getComputedStyle(el).position)).toBe('sticky')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await menu(page, 'Edit service')
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
})

test('a proposal reviewed elsewhere is blocked before confirming and unapproved services cannot be activated', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/admin/services?tab=proposals&proposal=${proposalId}`)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click()
  state.proposal.status = 3
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('data has changed')
  expect(state.writes).toHaveLength(0)
  state.service.approvalStatus = 3; state.service.isActive = false
  await page.goto(`/admin/services?service=${id}`)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Actions for Everyday wash', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Activate service', exact: true })).toBeDisabled()
})

test('category has one All option and Merchant filter is shown only for proposals', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/admin/services?merchantId=${merchantId}`)
  await expect(page.getByRole('table')).toContainText('Everyday wash')
  await expect(page.getByRole('combobox', { name: 'Proposing merchant', exact: true })).toHaveCount(0)
  expect(state.filters.filter(row => row.take === 12).at(-1)).not.toHaveProperty('merchantId')
  await page.getByRole('combobox', { name: 'Category', exact: true }).click()
  await expect(page.getByRole('option', { name: 'All', exact: true })).toHaveCount(1)
  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: 'Merchant proposals', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Proposing merchant', exact: true })).toBeVisible()
})

test('service details are read-only and bulk preview never runs per-service requests', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services')
  await menu(page, 'Service details')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Delete service', exact: true })).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Pause service', exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  const reads = state.reads
  await page.getByRole('checkbox', { name: 'Select all services on this page', exact: true }).check()
  await page.getByRole('button', { name: 'Bulk actions', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Pause selected', exact: true })).toBeDisabled()
  await dialog.getByRole('tab', { name: 'Activate selected', exact: true }).click()
  await expect(dialog.getByText('0 services eligible for this action', { exact: true })).toBeVisible()
  await dialog.getByRole('tab', { name: 'Delete selected', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Delete selected', exact: true })).toBeDisabled()
  expect(state.reads).toBe(reads)
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('tab', { name: 'Merchant proposals', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bulk actions', exact: true })).toHaveCount(0)
})

test('Merchant photos appear in proposal rows and details and Reject hovers red with white text', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services?tab=proposals')
  const photo = page.getByRole('table').getByRole('img', { name: 'Central Laundry', exact: true })
  await expect(photo).toBeVisible()
  await expect.poll(() => photo.evaluate(el => el.naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Actions for Premium wash', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Proposal details', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('img', { name: 'Central Laundry', exact: true })).toBeVisible()
  const reject = dialog.getByRole('button', { name: 'Reject', exact: true })
  await reject.hover()
  await expect.poll(() => reject.evaluate(el => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)')
  const background = await reject.evaluate(el => getComputedStyle(el).backgroundColor)
  expect(background).not.toBe('rgba(0, 0, 0, 0)')
  expect(state.writes).toHaveLength(0)
})
