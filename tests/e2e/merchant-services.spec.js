import { test, expect } from '@playwright/test'
import { merchantSession } from './helpers/merchantSession'

const id = '77777777-7777-4777-8777-777777777777'
const proposalId = '88888888-8888-4888-8888-888888888888'

test('service tabs navigate and the detail modal displays returned photos', async ({ page }) => {
  await setup(page, { images: true })
  await page.goto('/merchant/services')
  await expect(page.locator('aside').getByRole('link', { name: 'Service management', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'My proposals', exact: true }).click()
  await expect(page).toHaveURL(/tab=proposals/)
  await page.getByRole('tab', { name: 'Service catalog', exact: true }).click()
  await action(page, 'Service details')
  const image = page.getByRole('dialog').getByRole('img', { name: 'Service photo 1' })
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByRole('dialog').getByRole('region', { name: 'Photos' })).toBeVisible()
})
async function setup(page, options = {}) {
  await merchantSession(page, options)

  const service = { id, code: 'SVC-TEST', name: 'Everyday service', description: 'Care for everyday clothes', imageUrls: options.images ? ['/uploads/mock/service.svg'] : [], unitPrice: 50000, pricePerKg: 15000, pricePerItem: null, serviceType: 1, unit: 'kg', estimatedDurationHours: 24, isActive: true, approvalStatus: 2 }
  const state = { service, lists: [], writes: [], failWrite: false, failRead: false, proposal: { id: proposalId, serviceId: id, requestType: 2, status: 3, proposed: { ...service, name: 'Revised service', unitPrice: 60000, imageUrls: [] }, current: { ...service, imageUrls: [] }, rejectionReason: 'Please revise the price', reason: 'Customer request', createdAt: '2026-11-07T01:00:00Z' } }
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^\/api/, '')
    if (path.startsWith('/uploads/mock/') && options.images) {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#b1cefc"/></svg>' })
    }
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    const fail = () => route.fulfill({ status: 500, json: { succeeded: false, message: 'merchant.invalidResponse' } })
    expect(path.startsWith('/wash-service')).toBe(false)
    expect(path.startsWith('/customer/services')).toBe(false)
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', role: 'Merchant', fullName: 'Store Owner' })
    }
    if (path === '/merchant-profile') {
      return ok({ id: 'merchant-test', businessName: 'Test Store', status: 1 })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === '/files/images') {
      return ok({ url: '/uploads/mock/service.png' })
    }
    if (['/merchant-service/filter', '/service-proposal/filter'].includes(path)) {
      const body = req.postDataJSON()
      expect(body).not.toHaveProperty('merchantId')
      expect(body).not.toHaveProperty('sortBy')
      if (path === '/service-proposal/filter') {
        expect(body).not.toHaveProperty('keyword')
      }
      if (body.take === 1) {
        return route.fulfill({ json: { succeeded: true, total: path === '/merchant-service/filter' ? body.isActive === false ? 2 : body.isActive === true ? 8 : 10 : { 1: 3, 2: 4, 3: 1 }[body.status], list: [] } })
      }
      if (state.failRead) {
        return fail()
      }
      state.lists.push({ path, body })
      return route.fulfill({ json: { succeeded: true, total: body.take === 100 ? 1 : 25, list: path === '/merchant-service/filter' ? [{ ...state.service, name: body.page === 2 ? 'Page two service' : state.service.name }] : [state.proposal] } })
    }
    if (path === `/service-proposal/${proposalId}`) {
      return state.failRead ? fail() : ok(state.proposal)
    }
    if (path === '/merchant-service/proposals' || path === `/merchant-service/${id}/proposals`) {
      const body = req.postDataJSON()
      expect(body).not.toHaveProperty('merchantId')
      expect(body).not.toHaveProperty('isActive')
      expect(body).not.toHaveProperty('approvalStatus')
      state.writes.push({ path, body })
      if (state.failWrite) {
        return fail()
      }
      const edit = path !== '/merchant-service/proposals'
      state.proposal = { id: proposalId, status: 1, serviceId: edit ? id : null, requestType: edit ? 2 : 1, proposed: body, current: edit ? { ...state.service } : null, reason: body.reason, createdAt: '2026-11-07T01:00:00Z' }
      return ok(state.proposal)
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return state
}
async function action(page, name, item = 'Everyday service') {
  await page.getByRole('button', { name: `Actions for ${item}`, exact: true }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}
async function newDraft(page) {
  await page.getByRole('button', { name: 'Propose new service', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Service name', { exact: false }).fill('New service')
  await dialog.getByLabel('Base price (VND)', { exact: false }).fill('60000')
  return dialog
}
test('shared catalog filters, server statistics and paging persist through reload', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/services')
  await expect(page.getByRole('table')).toContainText('Everyday service')
  const summary = page.getByRole('region', { name: 'Shared catalog and my proposal statistics' })
  await expect(summary.getByRole('heading', { name: 'Shared services', exact: true }).locator('..')).toContainText('10')
  await expect(summary.getByRole('heading', { name: 'Pending proposals', exact: true }).locator('..')).toContainText('3')
  await page.getByRole('searchbox', { name: 'Search services' }).fill('Everyday')
  await page.getByRole('searchbox', { name: 'Search services' }).press('Enter')
  await expect.poll(() => state.lists.at(-1)?.body.keyword).toBe('Everyday')
  await page.getByRole('combobox', { name: 'Availability', exact: true }).click()
  await page.getByRole('option', { name: 'Inactive', exact: true }).click()
  await expect.poll(() => state.lists.at(-1)?.body.isActive).toBe(false)
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('table')).toContainText('Page two service')
  expect(state.lists.at(-1).body).toMatchObject({ page: 2, isActive: false, keyword: 'Everyday' })
})
test('new proposal validates, uploads photos and stays pending without changing the catalog', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/services')
  await page.getByRole('button', { name: 'Propose new service', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Submit proposal' }).click()
  await expect(dialog.getByText('Enter a service name, up to 200 characters.')).toBeVisible()
  expect(state.writes).toHaveLength(0)
  await dialog.getByLabel('Service name', { exact: false }).fill('New service')
  await dialog.getByLabel('Base price (VND)', { exact: false }).fill('60000')
  await dialog.getByLabel('Proposal reason', { exact: true }).fill('New customer need')
  await dialog.getByLabel('Service photos (optional)', { exact: true }).setInputFiles({ name: 'service.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=', 'base64') })
  await dialog.getByRole('button', { name: 'Submit proposal' }).click()
  await expect(page.getByRole('tab', { name: 'My proposals', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('table')).toContainText('New service')
  expect(state.writes[0].body).toMatchObject({ name: 'New service', unitPrice: 60000, pricePerKg: null, pricePerItem: null, reason: 'New customer need', imageUrls: ['/uploads/mock/service.png'] })
  expect(state.service.name).toBe('Everyday service')
  await action(page, 'Proposal details', 'New service')
  await expect(page.getByRole('dialog')).toContainText('New customer need')
  await expect(page.getByRole('dialog')).toContainText('Pending')
})
test('update proposals keep unit/category and show the before/after snapshot', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/services')
  await action(page, 'Propose changes')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Unit', { exact: false }).first()).toHaveValue('kg')
  await expect(dialog.getByLabel('Unit', { exact: false }).first()).toHaveAttribute('readonly', '')
  await expect(dialog.getByRole('combobox', { name: 'Category', exact: true })).toBeDisabled()
  await dialog.getByLabel('Base price (VND)', { exact: false }).fill('65000')
  await dialog.getByRole('button', { name: 'Submit proposal' }).click()
  await expect(page.getByRole('tab', { name: 'My proposals', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('table')).toContainText('Everyday service')
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ path: `/merchant-service/${id}/proposals`, body: { unitPrice: 65000, unit: 'kg', serviceType: 1, imageUrls: [] } })
  expect(state.service.unitPrice).toBe(50000)
  await action(page, 'Proposal details')
  await expect(page.getByRole('heading', { name: 'Snapshot when submitted' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Proposed changes', exact: true })).toBeVisible()
})
test('unknown submission locks repeat writes and stale service data never posts', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/services')
  state.failWrite = true
  const dialog = await newDraft(page)
  await dialog.getByRole('button', { name: 'Submit proposal' }).click()
  await expect(dialog.getByRole('alert')).toContainText('submission outcome is unknown')
  await expect(dialog.getByRole('button', { name: 'Submit proposal' })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  state.failWrite = false
  await action(page, 'Propose changes')
  await expect(page.getByRole('dialog').getByLabel('Service name', { exact: false })).toHaveValue('Everyday service')
  state.service.unitPrice = 70000
  await page.getByRole('dialog').getByRole('button', { name: 'Submit proposal' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('service has changed')
  expect(state.writes).toHaveLength(1)
})
test('proposal status/type filters and rejected reasons use the owned proposal API', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/services?tab=proposals&state=3&type=2&page=2')
  await expect(page.getByRole('table')).toContainText('Please revise the price')
  expect(state.lists.at(-1)).toMatchObject({ path: '/service-proposal/filter', body: { status: 3, requestType: 2, page: 2 } })
  await expect(page.getByRole('searchbox')).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Proposal type', exact: true }).click()
  await expect(page.getByRole('option', { name: 'Delete', exact: true })).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'New service', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await action(page, 'Proposal details', 'Revised service')
  await expect(page.getByRole('dialog')).toContainText('Please revise the price')
  await expect(page.getByRole('dialog')).toContainText('Customer request')
})
test('mobile dark forms and failed service reads remain usable without page overflow', async ({ page }) => {
  const state = await setup(page, { dark: true })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/merchant/services')
  await expect(page.getByRole('table')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const dialog = await newDraft(page)
  const close = dialog.getByRole('button', { name: 'Close', exact: true }).last()
  await close.scrollIntoViewIfNeeded()
  await expect(close).toBeVisible()
  await close.click()
  state.failRead = true
  await action(page, 'Service details')
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Propose changes' })).toHaveCount(0)
})
