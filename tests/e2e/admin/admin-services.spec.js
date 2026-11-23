import { adminUpgradeMocks } from '../helpers/adminUpgradeMocks'
import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'
const id = 'a0000000-0000-4000-8000-000000000001', proposalId = 'b0000000-0000-4000-8000-000000000001', merchantId = 'c0000000-0000-4000-8000-000000000001'

test('Admin proposals filter categories on the server and reset page', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services?tab=proposals&page=2&state=1')
  await page.getByRole('combobox', { name: 'Category', exact: true }).click()
  await page.getByRole('option', { name: 'Special care', exact: true }).click()
  await expect.poll(() => state.proposalFilters.at(-1)).toMatchObject({ categoryIds: ['ca000000-0000-0000-0000-000000000006'], page: 1, status: 1 })
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Category', exact: true })).toContainText('Special care')
  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await expect.poll(() => state.proposalFilters.at(-1)?.categoryIds).toBeUndefined()
})

test('Admin category filter shares the search panel and resets with filters', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services')
  const category = page.getByRole('combobox', { name: 'Category', exact: true })
  await expect(category).toBeEnabled()
  await expect(category.locator('xpath=ancestor::section').getByRole('search')).toBeVisible()
  await category.click()
  await page.getByRole('option', { name: 'Special care', exact: true }).click()
  await expect.poll(() => state.filters.at(-1)?.categoryIds).toEqual(['ca000000-0000-0000-0000-000000000006'])
  await expect(page).toHaveURL(/categoryId=/)
  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await expect(page).not.toHaveURL(/categoryId=/)
  await expect.poll(() => state.filters.at(-1)?.categoryIds).toBeUndefined()
  await category.click()
  await page.getByRole('option', { name: 'Special care', exact: true }).click()
  await expect(page).toHaveURL(/categoryId=/)
  await page.getByRole('tab', { name: 'Merchant proposals', exact: true }).click()
  await expect(page).not.toHaveURL(/categoryId=/)
  await expect(category).toBeVisible()
})

test('Admin search suggestions keep catalog/proposal scope and highlight matching fields', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services')
  const search = page.getByRole('search').getByRole('combobox')
  await search.fill('svc_test')
  const option = page.getByRole('option').filter({ hasText: 'Everyday wash' })
  await expect(option).toBeVisible()
  await expect(option.getByText('SVC_TEST', { exact: true })).toHaveCSS('font-weight', '700')
  await expect(option).toContainText('50,000')
  await expect.poll(() => state.filters.at(-1)?.keyword).toBe('svc_test')
  await search.press('ArrowDown')
  await search.press('Enter')
  await expect(page).toHaveURL(/keyword=Everyday\+wash/)
  expect(state.writes).toHaveLength(0)
})
async function setup(page, options = {}) {
  await merchantSession(page, { role: 'Admin', ...options })
  const service = { id, categoryId: 'ca000000-0000-0000-0000-000000000001', categoryName: 'Standard wash', categoryIsActive: true, effectiveIsActive: true, merchantId, code: 'SVC_TEST', name: 'Everyday wash', description: 'Careful cleaning', unitPrice: 50000, pricePerKg: null, pricePerItem: null, estimatedDurationHours: 24, serviceType: 1, unit: 'kg', isActive: true, approvalStatus: 2, imageUrls: [] }
  const state = { proposalFilters: [], service, proposal: { id: proposalId, merchantId, merchantName: 'Central Laundry', merchantImageUrls: ['/uploads/mock/merchant.svg'], serviceId: id, requestType: 2, status: 1, current: { ...service }, proposed: { ...service, name: 'Premium wash', unitPrice: 60000 }, reason: 'Improve service', createdAt: '2026-11-08T00:00:00Z' }, filters: [], writes: [], stale: false, unknown: false, reads: 0, removed: false }
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, ''), body = /application\/json/.test(req.headers()['content-type'] || '') ? req.postDataJSON() : undefined
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    const list = (rows, total = rows.length) => route.fulfill({ json: { succeeded: true, list: rows, total, currentPage: body.page } })
    if (await adminUpgradeMocks(route, state, [{ id: merchantId, name: 'Central Laundry', status: 1 }])) {
      return
    }
    if (path === '/admin/lookups/service-categories') {
      return route.fulfill({ json: { succeeded: true, list: [{ id: 'ca000000-0000-0000-0000-000000000001', code: 'WASH', name: 'Standard wash', isActive: true }, { id: 'ca000000-0000-0000-0000-000000000006', code: 'SPECIAL', name: 'Special care', isActive: true }], total: 2, currentPage: 1, totalPages: 1 } })
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
      state.proposalFilters.push(body)
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
        Object.assign(service, body, req.method() === 'POST' ? { code: 'SV1234' } : {}); return ok(service)
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

test('backend sync: batch services uses one guarded request and clears the selection', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services')
  await page.getByRole('checkbox', { name: 'Select all services on this page', exact: true }).check()
  await page.getByRole('button', { name: 'Bulk actions', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Pause selected', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ path: '/wash-service/batch', body: { action: 'Status', isActive: false, operationId: expect.any(String), items: [{ id, expectedVersion: 'version-1' }] } })
  expect(state.service.isActive).toBe(false)
  await expect(page.getByRole('button', { name: 'Bulk actions', exact: true })).toHaveCount(0)
})

test('service table and detail show only the first catalog photo and retain the existing link', async ({ page }) => {
  const state = await setup(page)
  state.service.imageUrls = ['/uploads/mock/service-1.png', '/uploads/mock/service-2.png', '/uploads/mock/service-3.png']
  await page.route('**/api/uploads/mock/service-*.png', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="skyblue"/></svg>' }))
  await page.goto('/admin/services')
  await expect(page.getByRole('table').getByRole('img', { name: 'Everyday wash', exact: true })).toBeVisible({ timeout: 20000 })
  await expect(page.getByRole('table').getByText('+2', { exact: true })).toHaveCount(0)
  await menu(page, 'Service details')
  const gallery = page.getByRole('dialog').getByRole('region', { name: 'Photos', exact: true })
  await expect(gallery.getByRole('link')).toHaveCount(1)
  for (const link of await gallery.getByRole('link').all()) {
    await expect(link).toHaveAttribute('target', '_blank')
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})

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

test('service image picker keeps the modal header and footer visible after selecting photos', async ({ page }) => {
  const state = await setup(page)
  await page.setViewportSize({ width: 390, height: 720 })
  await page.goto('/admin/services')
  await menu(page, 'Edit service')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Service photos (optional)', exact: true })).toBeVisible()
  await expect(dialog.locator('button').filter({ hasText: /^Add photos$/ })).toHaveCSS('border-style', 'dashed')
  const chooserPromise = page.waitForEvent('filechooser')
  await dialog.locator('button').filter({ hasText: /^Add photos$/ }).click()
  const chooser = await chooserPromise
  await chooser.setFiles({ name: 'service.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCGsAAAAASUVORK5CYII=', 'base64') })
  await expect(dialog.getByRole('img')).toHaveCount(1)
  await expect(dialog.getByText('1 / 1', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('Add photos', { exact: true })).not.toHaveAttribute('multiple')
  for (const bottom of [false, true]) {
    await dialog.locator('[data-dialog-body]').evaluate((element, bottom) => {
      element.scrollTop = bottom ? element.scrollHeight : 0
    }, bottom)
    await expect.poll(() => dialog.evaluate(element => {
      const rect = element.getBoundingClientRect()
      const header = element.querySelector('[data-dialog-header]').getBoundingClientRect()
      const footer = element.querySelector('[data-dialog-footer]').getBoundingClientRect()
      return Math.abs(header.top - rect.top) <= 2 && Math.abs(footer.bottom - rect.bottom) <= 2 && element.scrollTop === 0
    })).toBe(true)
  }
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})

test('Admin creates and edits supported service fields and image list without approval writes', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/services')
  await page.getByRole('button', { name: 'Add service', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Save service', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  await expect(dialog.getByLabel('Service code', { exact: true })).toBeDisabled()
  for (const [label, value] of [['Service name', 'Everyday wash'], ['Base price (VND)', '50000']]) {
    await dialog.getByLabel(label, { exact: true }).fill(value)
  }
  await dialog.getByRole('combobox', { name: 'Category', exact: true }).click()
  await page.getByRole('option', { name: 'Special care', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save service', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await menu(page, 'Edit service')
  dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Service code', { exact: true })).toBeDisabled()
  await expect(dialog.getByLabel('Service code', { exact: true })).toHaveValue('SV1234')
  await dialog.getByLabel('Base price (VND)', { exact: true }).fill('55000')
  await dialog.getByRole('button', { name: 'Save service', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[1].body).toMatchObject({ id, unitPrice: 55000, merchantId: null, isActive: true })
  expect(state.writes[1].body.imageUrls).toEqual([])
  expect(state.writes[0].body).not.toHaveProperty('code')
  expect(state.writes[1].body).not.toHaveProperty('code')
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
  expect(state.writes[0].body).toMatchObject({ serviceId: id, approvalStatus: 2, isActive: false })
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
  expect(state.writes[0]).toMatchObject({ path: `/service-proposal/${proposalId}/reject`, body: { reason: 'Please clarify the pricing' } })
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
  await expect(dialog.getByRole('button', { name: 'Pause selected', exact: true })).toBeEnabled()
  await dialog.getByRole('tab', { name: 'Activate selected', exact: true }).click()
  await expect(dialog.getByText('0 services eligible for this action', { exact: true })).toBeVisible()
  await dialog.getByRole('tab', { name: 'Delete selected', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Delete selected', exact: true })).toBeEnabled()
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


test('service review confirmation closes independently and locks an unknown result', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/admin/services?tab=proposals&proposal=${proposalId}`)
  await page.getByRole('button', { name: 'Reject', exact: true }).click()
  let confirmation = page.getByRole('dialog', { name: 'Reject', exact: true })
  await expect(confirmation).toBeVisible()
  await expect(confirmation.locator('[data-dialog-header]')).toHaveAttribute('data-tone', 'danger')
  await confirmation.getByRole('button', { name: 'Close', exact: true }).first().click()
  await expect(confirmation).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reject', exact: true })).toBeFocused()
  expect(state.writes).toHaveLength(0)
  await page.getByRole('button', { name: 'Approve', exact: true }).click()
  confirmation = page.getByRole('dialog', { name: 'Approve', exact: true })
  await expect(confirmation.locator('[data-dialog-header]')).toHaveAttribute('data-tone', 'success')
  await page.keyboard.press('Escape')
  await expect(confirmation).toHaveCount(0)
  await page.getByRole('button', { name: 'Reject', exact: true }).click()
  confirmation = page.getByRole('dialog', { name: 'Reject', exact: true })
  await confirmation.getByLabel('Rejection reason', { exact: true }).fill('Please provide a clear service scope')
  await confirmation.getByRole('checkbox').check()
  state.unknown = true
  await confirmation.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(confirmation.getByRole('alert')).toBeVisible()
  await expect(confirmation.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
})

test('category lock affects effective availability without changing the service own toggle meaning', async ({ page }) => {
  const state = await setup(page)
  Object.assign(state.service, { categoryIsActive: false, effectiveIsActive: false, isActive: true })
  await page.goto('/admin/services')
  await expect(page.getByRole('table')).toContainText('Service unavailable because its category is locked')
  await page.getByRole('button', { name: 'Actions for Everyday wash', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Pause service', exact: true })).toBeEnabled()
  await page.keyboard.press('Escape')
  state.service.isActive = false
  await page.reload()
  await page.getByRole('button', { name: 'Actions for Everyday wash', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Activate service', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
})


test('workspace Admin service name opens its detail modal', async ({ page }) => {
  await setup(page)
  await page.goto('/admin/services')
  await page.getByRole('table').getByRole('button', { name: 'Everyday wash', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Everyday wash')
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last()).toBeVisible()
})

test('long service bulk preview uses only the dialog body scrollbar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 620 })
  const state = await setup(page)
  const services = Array.from({ length: 10 }, (_, index) => ({ ...state.service, id: `a0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, name: `Laundry service ${index + 1}`, code: `SV${index}` }))
  await page.route('**/api/wash-service/filter', route => route.fulfill({ json: { succeeded: true, list: services, total: 10, currentPage: 1, totalPages: 1 } }))
  await page.goto('/admin/services')
  await page.getByRole('checkbox', { name: 'Select all services on this page', exact: true }).check()
  await page.getByRole('button', { name: 'Bulk actions', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Laundry service 10', { exact: true })).toBeAttached()
  const body = dialog.locator('[data-dialog-body]')
  await body.evaluate(node => {
    node.scrollTop = node.scrollHeight
  })
  await expect(dialog.getByText('Laundry service 10', { exact: true })).toBeInViewport()
  const owners = await dialog.evaluate(root => [root, ...root.querySelectorAll('*')].filter(node => /auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1).length)
  expect(owners).toBe(1)
  await expect(dialog.locator('[data-dialog-header]')).toBeInViewport()
  await expect(dialog.locator('[data-dialog-footer]')).toBeInViewport()
  expect(state.writes).toHaveLength(0)
})
