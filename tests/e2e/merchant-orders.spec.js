import { expect, test } from '@playwright/test'
import { merchantSession } from './helpers/merchantSession'

const id = '11111111-1111-4111-8111-111111111111'
const shipperId = '22222222-2222-4222-8222-222222222222'
async function setup(page, options = {}) {
  await merchantSession(page, options)
  const state = { lists: [], writes: [], failWrite: false, failRead: false, shippers: true, order: {
    id, orderCode: 'WG-ORDER-123', merchantOrderCode: 'MC-123', status: options.status || 3, paymentStatus: options.paymentStatus || 1,
    createdOn: 1794009600, finalAmount: 50000, totalAmount: 50000, discountAmount: 0, weightSurchargeAmount: 0,
    actualWeightKg: null, includedWeightKg: 5, baseProcessingHours: 12, lockerName: 'Ben Thanh Locker', boxNumber: '3',
    depositPinCode: 'SECRET_DEPOSIT', pickupPinCode: 'SECRET_PICKUP', customerName: 'PRIVATE_CUSTOMER', customerPhoneNumber: 'PRIVATE_PHONE',
    serviceNames: ['Everyday wash'], isNew: false, items: [{ id: 'item', serviceName: 'Everyday wash', quantity: 1, unitPrice: 50000, subTotal: 50000, isWeightBased: true }],
    timeline: [{ id: 'event-1', status: 3, actorName: 'Collection staff', timestamp: 1794009600, note: 'Collected at the store' }]
  } }
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^\/api/, '')
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', fullName: 'Alex Store Owner', role: 'Merchant', email: 'merchant@example.test' })
    }
    if (path === '/merchant-profile') {
      return ok({ id: 'merchant-test', businessName: 'Test Store', status: 1 })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: {} })
    }
    if (path === '/wash-order/filter') {
      const body = req.postDataJSON()
      state.lists.push(body)
      expect(body).not.toHaveProperty('merchantId')
      expect(body).not.toHaveProperty('customerId')
      if (body.take === 1 && state.summaryError) {
        return route.fulfill({ status: 500, json: { succeeded: false, message: 'merchant.invalidResponse' } })
      }
      const counts = body.fromDate || body.toDate ? { 4: 2, 12: 1 } : { 1: 1, 2: 2, 3: 3, 4: 18, 5: 1, 6: 1, 7: 1, 8: 2, 9: 1, 10: 2, 11: 1, 12: 8, 13: 1, 99: 2 }
      const total = body.status ? counts[body.status] || 0 : Object.values(counts).reduce((sum, value) => sum + value, 0)
      return route.fulfill({ json: { succeeded: true, total, currentPage: body.page, list: body.take === 1 ? [] : [{ ...state.order, orderCode: body.page === 2 ? 'WG-PAGE-2' : state.order.orderCode }] } })
    }
    if (path === `/wash-order/${id}`) {
      if (state.failRead) {
        return route.fulfill({ status: 403, json: { succeeded: false, message: 'merchant.invalidResponse' } })
      }
      return ok(state.order)
    }
    if (path === `/wash-order/${id}/available-shippers`) {
      return ok(state.shippers ? [{ id: shipperId, fullName: 'Test Driver', phone: '0901234567', taskType: options.status === 9 ? 2 : 1, vehiclePlate: '59-ABC' }] : [])
    }
    if (req.method() === 'PUT' && [`/wash-order/${id}/actual-weight`, '/wash-order/status', '/wash-order/assign-shipper'].includes(path)) {
      const body = req.postDataJSON()
      state.writes.push({ path, body })
      if (state.failWrite) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      if (path.endsWith('actual-weight')) {
        Object.assign(state.order, { actualWeightKg: body.weightKg, finalAmount: 70000, weightSurchargeAmount: 20000, estimatedFinishAt: '2026-11-08T06:00:00Z' })
      }
      if (path.endsWith('/status')) {
        Object.assign(state.order, { status: body.newStatus })
      }
      if (path.endsWith('assign-shipper')) {
        Object.assign(state.order, { shipperId: body.shipperId, shipperName: 'Test Driver', assignedTaskType: options.status === 9 ? 2 : 1 })
      }
      return ok(state.order)
    }
    throw new Error(`Unexpected API: ${req.method()} ${path}`)
  })
  return state
}

test('merchant order table filters and pages on the server, preserves URL and opens scoped details', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/orders')
  await expect(page.getByRole('heading', { name: 'Order management', exact: true })).toBeVisible()
  await expect(page.getByRole('table')).toContainText('WG-ORDER-123')
  await page.getByRole('searchbox', { name: 'Search orders', exact: true }).fill('WG-SEARCH')
  await page.getByRole('button', { name: 'Search orders', exact: true }).click()
  await expect.poll(() => state.lists.filter((body) => body.take === 12).at(-1).keyword).toBe('WG-SEARCH')
  await page.getByRole('combobox', { name: 'Order status', exact: true }).click()
  await page.getByRole('option', { name: 'Washing', exact: true }).click()
  await expect.poll(() => state.lists.filter((body) => body.take === 12).at(-1).status).toBe(4)
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('WG-PAGE-2')
  await expect(page).toHaveURL(/page=2/)
  await page.reload()
  await expect.poll(() => state.lists.filter((body) => body.take === 12).at(-1).page).toBe(2)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('WG-ORDER-123')
  await page.getByRole('button', { name: 'View order WG-ORDER-123', exact: true }).click()
  await expect(page).toHaveURL(`/merchant/orders/${id}`)
  await expect(page.getByRole('heading', { name: 'WG-ORDER-123', exact: true })).toBeVisible()
  await expect(page.locator('main')).not.toContainText('PRIVATE_CUSTOMER')
  await expect(page.locator('main')).not.toContainText('SECRET_')
})

test('weighing gates processing, server-confirmed price is shown, and processing allows only valid transitions', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/merchant/orders/${id}`)
  await expect(page.getByRole('button', { name: 'Update processing', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Weigh and confirm price', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Actual weight (kg)', { exact: true }).fill('6.25')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body).toEqual({ weightKg: 6.25 })
  await expect(page.getByText('70,000', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Update processing', exact: true }).click()
  await expect(dialog.getByRole('combobox', { name: 'Next status', exact: true })).toContainText('Washing')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes.at(-1).body).toEqual({ orderId: id, newStatus: 4, note: null })
  await expect(page.locator('main').getByText('Washing', { exact: true })).toBeVisible()
})

test('assignment loads eligible shippers and submits collection or return without spoofing actor or status', async ({ page }) => {
  const state = await setup(page, { status: 9, paymentStatus: 2 })
  await page.goto(`/merchant/orders/${id}`)
  await page.getByRole('button', { name: 'Assign return delivery', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: 'Test Driver', exact: true }).check()
  await dialog.getByLabel('Note (up to 500 characters)', { exact: true }).fill('Please return today')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes[0].body).toEqual({ orderId: id, shipperId, shipperName: 'Test Driver', note: 'Please return today' })
  await expect(page.getByText('Test Driver', { exact: true })).toBeVisible()
})

test('unknown write results lock retry, stale orders do not write, and denied reads expose no order data', async ({ page }) => {
  const state = await setup(page)
  state.failWrite = true
  await page.goto(`/merchant/orders/${id}`)
  await page.getByRole('button', { name: 'Weigh and confirm price', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Actual weight (kg)', { exact: true }).fill('6')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('The update outcome is unknown.')
  await expect(dialog.getByRole('button', { name: 'Confirm update', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Weigh and confirm price', exact: true }).click()
  dialog = page.getByRole('dialog')
  state.order.status = 4
  await dialog.getByLabel('Actual weight (kg)', { exact: true }).fill('6')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('This order has changed.')
  expect(state.writes).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  state.failRead = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'WG-ORDER-123', exact: true })).toHaveCount(0)
})

test('mobile dark detail and empty shipper list keep controls usable without inventing candidates', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const state = await setup(page, { status: 2, dark: true })
  state.shippers = false
  await page.goto(`/merchant/orders/${id}`)
  await page.getByRole('button', { name: 'Assign collection', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('No eligible shipper is available.')
  await expect(dialog.getByRole('button', { name: 'Confirm update', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(state.writes).toHaveLength(0)
})

test('date scope updates the list and whole-result statistics, validates ranges and preserves reload', async ({ page }) => {
  const state = await setup(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/merchant/orders')
  const summary = page.getByRole('region', { name: 'Order statistics', exact: true })
  await expect(summary.getByRole('heading', { name: 'Total assigned orders', exact: true }).locator('..')).toContainText('44')
  const search = await page.getByRole('search', { name: 'Search orders', exact: true }).boundingBox()
  const status = await page.getByRole('combobox', { name: 'Order status', exact: true }).boundingBox()
  expect(Math.abs(search.y - status.y)).toBeLessThan(2)
  expect(search.height).toBe(status.height)
  const listRequests = () => state.lists.filter((body) => body.take === 12)
  const count = listRequests().length
  await page.getByLabel('From date', { exact: true }).fill('2026-11-08')
  await page.getByLabel('To date', { exact: true }).fill('2026-11-07')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Choose valid dates.')
  expect(listRequests()).toHaveLength(count)
  await page.getByLabel('From date', { exact: true }).fill('2026-11-07')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  const fromDate = Date.UTC(2026, 10, 6, 17) / 1000
  const toDate = Date.UTC(2026, 10, 7, 16, 59, 59) / 1000
  await expect.poll(() => listRequests().at(-1)).toMatchObject({ fromDate, toDate, page: 1 })
  await expect(summary.getByRole('heading', { name: 'Total assigned orders', exact: true }).locator('..')).toContainText('3')
  await expect(summary.getByRole('heading', { name: 'Processing', exact: true }).locator('..')).toContainText('2')
  await page.reload()
  await expect(page.getByLabel('From date', { exact: true })).toHaveValue('2026-11-07')
  await page.getByRole('combobox', { name: 'Order status', exact: true }).click()
  await page.getByRole('option', { name: 'Washing', exact: true }).click()
  await expect.poll(() => listRequests().at(-1)).toMatchObject({ status: 4, fromDate, toDate })
  await expect(summary.getByRole('heading', { name: 'Total assigned orders', exact: true }).locator('..')).toContainText('3')
  await page.getByRole('button', { name: 'Clear date range', exact: true }).click()
  await expect.poll(() => listRequests().at(-1).fromDate).toBeUndefined()
  state.summaryError = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(summary.getByRole('alert')).toBeVisible()
  await expect(summary.getByRole('heading', { name: 'Total assigned orders', exact: true })).toHaveCount(0)
  await expect(page.getByRole('table')).toBeVisible()
})
