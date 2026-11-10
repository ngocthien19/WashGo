import { mockOrderActions, mockStatusCounts } from './helpers/merchantOrderData'
import { expect, test } from '@playwright/test'
import { merchantSession } from './helpers/merchantSession'

const id = '11111111-1111-4111-8111-111111111111'
const shipperId = '22222222-2222-4222-8222-222222222222'

test('Merchant list shows service thumbnails and opens collection assignment from its menu', async ({ page }) => {
  const state = await setup(page, { status: 2 })
  state.order.services = [{ serviceId: 'service-1', serviceName: 'Everyday wash', serviceThumbnailUrl: '/service-test.svg' }]
  await page.route('**/service-test.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="blue"/></svg>' }))
  await page.goto('/merchant/orders')
  await expect(page.getByRole('img', { name: 'Everyday wash', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'View order WG-ORDER-123' }).click()
  await page.getByRole('menuitem', { name: 'Assign collection' }).click()
  await expect(page.getByRole('dialog').getByText(/driver@example.test/)).toBeVisible()
  expect(state.writes).toHaveLength(0)
})

test('Merchant list checks current permissions before opening collection assignment', async ({ page }) => {
  const state = await setup(page, { status: 2 })
  state.allowedActions = { canAssignShipper: false, allowedNextStatuses: [], statusOptions: [] }
  await page.goto('/merchant/orders')
  await page.getByRole('button', { name: 'View order WG-ORDER-123' }).click()
  await page.getByRole('menuitem', { name: 'Assign collection' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})

async function setup(page, options = {}) {
  await merchantSession(page, options)
  const operations = new Map()
  const state = { calls: [], summaries: [], lists: [], writes: [], failWrite: false, failRead: false, shippers: true, order: {
    id, revision: 1, orderCode: 'WG-ORDER-123', merchantOrderCode: 'MC-123', status: options.status || 3, paymentStatus: options.paymentStatus || 1,
    createdOn: 1794009600, finalAmount: 50000, totalAmount: 50000, discountAmount: 0, weightSurchargeAmount: 0,
    actualWeightKg: null, includedWeightKg: 5, baseProcessingHours: 12, lockerName: 'Ben Thanh Locker', boxNumber: '3',
    depositPinCode: 'SECRET_DEPOSIT', pickupPinCode: 'SECRET_PICKUP', customerName: 'PRIVATE_CUSTOMER', customerPhoneNumber: 'PRIVATE_PHONE',
    serviceNames: ['Everyday wash'], isNew: false, items: [{ id: 'item', serviceName: 'Everyday wash', quantity: 1, unitPrice: 50000, subTotal: 50000, isWeightBased: true }],
    timeline: [{ id: 'event-1', status: 3, actorName: 'Collection staff', timestamp: 1794009600, note: 'Collected at the store' }]
  } }
  await page.route('**/api/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace(/^\/api/, '')
    state.calls.push(path)
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
    if (path === '/locker/filter') {
      return route.fulfill({ json: { succeeded: true, list: [], total: 0, currentPage: 1 } })
    }
    if (path === `/shipper/${shipperId}`) {
      return ok({ id: shipperId, fullName: 'Test Driver', email: 'driver@example.test', phone: '0901234567', vehicleType: 1, vehiclePlate: '59-ABC', isActive: true })
    }
    if (path === '/locker/33333333-3333-4333-8333-333333333333') {
      return ok({ id: '33333333-3333-4333-8333-333333333333', imageUrls: [] })
    }
    if (path === '/merchant-service/44444444-4444-4444-8444-444444444444') {
      return ok({ id: '44444444-4444-4444-8444-444444444444', imageUrls: [] })
    }
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: {} })
    }
    if (path === '/wash-order/summary') {
      const body = req.postDataJSON(); state.summaries.push(body)
      if (state.summaryError) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      const counts = body.fromDate || body.toDate ? { 4: 2, 12: 1 } : { 1: 1, 2: 2, 3: 3, 4: 18, 5: 1, 6: 1, 7: 1, 8: 2, 9: 1, 10: 2, 11: 1, 12: 8, 13: 1, 99: 2 }
      return ok({ total: Object.values(counts).reduce((sum, value) => sum + value, 0), statusCounts: mockStatusCounts(counts), generatedAt: '2026-11-07T10:00:00Z' })
    }
    if (path.includes('/operations/')) {
      state.lookups = (state.lookups || 0) + 1
      if (state.lookupFail) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      const operationId = path.split('/').at(-1)
      return operations.has(operationId) ? ok(operations.get(operationId)) : route.fulfill({ status: 404, json: { succeeded: false } })
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
      return ok({ ...state.order, allowedActions: state.allowedActions || mockOrderActions(state.order) })
    }
    if (path === `/wash-order/${id}/available-shippers`) {
      return ok(state.shippers ? [{ id: shipperId, fullName: 'Test Driver', email: 'driver@example.test', phone: '0901234567', vehicleType: 1, taskType: options.status === 9 ? 2 : 1, vehiclePlate: '59-ABC' }] : [])
    }
    if (req.method() === 'PUT' && [`/wash-order/${id}/actual-weight`, '/wash-order/status', '/wash-order/assign-shipper'].includes(path)) {
      const body = req.postDataJSON()
      state.writes.push({ path, body })
      if (state.conflict || body.expectedRevision !== state.order.revision) {
        return route.fulfill({ status: 409, json: { succeeded: false, data: state.order, meta: { code: 'RevisionMismatch' } } })
      }
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
      state.order.revision++
      operations.set(body.operationId, { operationId: body.operationId, orderId: id, operation: path.endsWith('actual-weight') ? 'UpdateWeight' : path.endsWith('/status') ? 'UpdateStatus' : 'AssignShipper', resultRevision: state.order.revision, resultStatus: state.order.status })
      if (state.commitThenFail) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
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
  await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
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
  expect(state.writes[0].body).toMatchObject({ weightKg: 6.25, expectedRevision: 1, expectedStatus: 3, operationId: expect.any(String) })
  await expect(page.getByText('70,000', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Update processing', exact: true }).click()
  await expect(dialog.getByRole('combobox', { name: 'Next status', exact: true })).toContainText('Washing')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes.at(-1).body).toMatchObject({ orderId: id, newStatus: 4, note: null, expectedRevision: 2, expectedStatus: 3, operationId: expect.any(String) })
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
  expect(state.writes[0].body).toMatchObject({ orderId: id, shipperId, shipperName: 'Test Driver', note: 'Please return today', expectedRevision: 1, expectedStatus: 9, operationId: expect.any(String) })
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
  expect(Math.abs(search.height - status.height)).toBeLessThan(1)
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


test('a committed write with a lost response is reconciled without repeating the mutation', async ({ page }) => {
  const state = await setup(page)
  state.commitThenFail = true
  await page.goto(`/merchant/orders/${id}`)
  await page.getByRole('button', { name: 'Weigh and confirm price', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Actual weight (kg)', { exact: true }).fill('6.25')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('The update outcome is unknown.')
  await dialog.getByRole('button', { name: 'Check operation result', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  expect(state.lookups).toBe(1)
  await expect(page.getByText('6.25 kg', { exact: true })).toBeVisible()
})

test('failed lookup keeps edits locked; a confirmed missing operation retries the identical request', async ({ page }) => {
  const state = await setup(page)
  state.failWrite = true
  state.lookupFail = true
  await page.goto(`/merchant/orders/${id}`)
  await page.getByRole('button', { name: 'Weigh and confirm price', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Actual weight (kg)', { exact: true }).fill('6')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await dialog.getByRole('button', { name: 'Check operation result', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('The result could not be checked.')
  await expect(dialog.getByRole('button', { name: 'Confirm update', exact: true })).toBeDisabled()
  state.lookupFail = false
  await dialog.getByRole('button', { name: 'Check operation result', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Retry confirmed operation', exact: true })).toBeEnabled()
  await expect(dialog.getByLabel('Actual weight (kg)', { exact: true })).toBeDisabled()
  state.failWrite = false
  await dialog.getByRole('button', { name: 'Retry confirmed operation', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(2)
  expect(state.writes[1].body).toEqual(state.writes[0].body)
})

test('revision-only changes and server conflicts require a fresh review rather than overwriting', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/merchant/orders/${id}`)
  await page.getByRole('button', { name: 'Weigh and confirm price', exact: true }).click()
  let dialog = page.getByRole('dialog')
  state.order.revision++
  await dialog.getByLabel('Actual weight (kg)', { exact: true }).fill('6')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('This order has changed.')
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Weigh and confirm price', exact: true }).click()
  dialog = page.getByRole('dialog')
  state.conflict = true
  await dialog.getByLabel('Actual weight (kg)', { exact: true }).fill('6')
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('The order has changed or the operation ID no longer matches.')
  await expect(dialog.getByRole('button', { name: 'Confirm update', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Check operation result', exact: true })).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
})

test('server permissions and overdue metadata drive the detail view', async ({ page }) => {
  const state = await setup(page, { status: 3 })
  state.allowedActions = { canUpdateWeight: false, updateWeightReasonCode: 'LegacyPricing', canAssignShipper: false, allowedNextStatuses: [], statusOptions: [] }
  Object.assign(state.order, { paymentDeadline: '2026-11-05T10:00:00Z', pickupDeadline: '2026-11-07T10:00:00Z', overdueTypes: ['PaymentOverdue'] })
  await page.goto(`/merchant/orders/${id}`)
  await expect(page.getByRole('button', { name: 'Weigh and confirm price', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Update processing', exact: true })).toHaveCount(0)
  await expect(page.getByText('Payment deadline', { exact: true })).toBeVisible()
  await expect(page.getByText('Payment overdue', { exact: true })).toBeVisible()
  await expect(page.getByText('This legacy order has no package pricing data for weighing and repricing.', { exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(0)
})

test('Merchant detail mirrors the layout with contacts, drop-off/pickup and highlighted assignment code', async ({ page }) => {
  const state = await setup(page, { status: 2 })
  Object.assign(state.order, { shipperId, shipperName: 'Test Driver', shipperEmail: 'driver@example.test', shipperPhone: '0901234567', shipperVehicleType: 1, shipperVehiclePlate: '59-ABC', lockerId: '33333333-3333-4333-8333-333333333333', lockerAddress: '123 Test Street' })
  state.order.items[0].serviceId = '44444444-4444-4444-8444-444444444444'
  await page.goto(`/merchant/orders/${id}`)
  await expect(page.getByText('driver@example.test', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Drop-off', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pickup', exact: true })).toBeVisible()
  await expect(page.locator('main header').getByRole('button', { name: 'Assign collection', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Order processing', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Assign collection', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/driver@example.test/)).toBeVisible()
  await expect(dialog.getByText(/Motorbike/)).toBeVisible()
  const code = dialog.getByText('WG-ORDER-123', { exact: true })
  expect(await code.evaluate(el => getComputedStyle(el).fontWeight)).toBe('600')
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  expect(state.writes).toHaveLength(0)
})

test('Merchant uses enriched order images and actual finances without catalog or shipper lookups', async ({ page }) => {
  const state = await setup(page)
  Object.assign(state.order, { lockerImageUrls: ['/order-deposit.svg'], returnLockerId: shipperId, returnLockerName: 'Return Station', returnLockerImageUrls: ['/order-return.svg'], shipperId, shipperName: 'Assigned Driver', shipperEmail: 'assigned@example.test', commissionRateApplied: 0, commissionStatus: 'Locked', commissionAmount: 0, merchantNetAmount: 50000, commissionBaseAmount: 50000, collectedLaundryAmount: 40000, refundedAmount: 10000, commissionOnCollected: 0, merchantPayoutOnCollected: 30000, financialStatus: 'Adjusted', services: [{ serviceId: 'service', serviceName: 'Everyday wash', serviceThumbnailUrl: '/order-service.svg' }] })
  state.order.items[0].serviceImageUrls = ['/order-service.svg']
  state.order.lockerAddress = '123 Test Street'
  state.order.timeline.push({ id: 'created', status: 1, actorRole: 'Customer', actorName: 'Customer', timestamp: 1794009400, note: null }, { id: 'deposited', status: 2, actorRole: 'Customer', actorName: 'Customer', timestamp: 1794009500, note: null })
  await page.route('**/order-*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="blue"/></svg>' }))
  await page.goto('/merchant/orders')
  const rateColumn = page.getByRole('columnheader', { name: 'Commission rate', exact: true })
  await expect(rateColumn).toBeAttached()
  await expect(page.getByRole('cell', { name: '0%', exact: true })).toBeAttached()
  await expect(page.getByText('assigned@example.test', { exact: true })).toBeAttached()
  await expect(page.getByRole('img', { name: 'Everyday wash', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Ben Thanh Locker', exact: true })).toHaveAttribute('src', /order-deposit.svg$/)
  await page.getByRole('link', { name: 'WG-ORDER-123', exact: true }).click()
  await expect(page.getByText('assigned@example.test', { exact: true })).toBeVisible()
  await expect(page.locator('dd').filter({ hasText: 'assigned@example.test' })).toHaveCSS('font-size', '16px')
  await expect(page.getByText('The customer created the order via the app or website.', { exact: true })).toBeVisible()
  await expect(page.getByText('The customer opened the locker using a PIN/QR code and successfully deposited the laundry.', { exact: true })).toBeVisible()
  const dropoff = page.getByRole('heading', { name: 'Drop-off', exact: true }).locator('..')
  await expect(dropoff.getByText('123 Test Street', { exact: true })).toBeVisible()
  expect(await dropoff.getByText('Ben Thanh Locker', { exact: true }).evaluate(el => el.parentElement.textContent)).toContain('123 Test Street')
  await expect(page.getByRole('img', { name: 'Return Station', exact: true })).toHaveAttribute('src', /order-return.svg$/)
  await expect(page.getByText('0%', { exact: true })).toBeVisible()
  await expect(page.getByText('Adjusted for refunds', { exact: true })).toBeVisible()
  await expect(page.getByText('Earnings on collections after refunds', { exact: true }).locator('..')).toContainText('30,000')
  expect(state.calls.some(path => path.startsWith('/locker/') || path.startsWith('/merchant-service/') || path.startsWith('/shipper/'))).toBe(false)
  expect(state.writes).toHaveLength(0)
})
