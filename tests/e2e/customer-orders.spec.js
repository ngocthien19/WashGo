import { test, expect } from '@playwright/test'

const id = '11111111-1111-4111-8111-111111111111'
const initialOrder = {
  id, orderCode: 'WG2611061234', createdOn: 1793923200, status: 1, paymentStatus: 1, paymentMethod: 2,
  lockerName: 'Ben Thanh Locker', boxNumber: '2', serviceNames: ['Everyday laundry'],
  finalAmount: 80000, totalAmount: 80000, discountAmount: 0, weightSurchargeAmount: 0,
  includedWeightKg: 5, actualWeightKg: null, estimatedFinishAt: '2026-11-07T10:00:00Z',
  depositPinCode: '123456', pickupPinCode: '654321', customerNote: 'Handle with care',
  qrCodeString: 'WASHGO:DEPOSIT:WG2611061234:123456', pickupQrCodeString: 'WASHGO:PICKUP:WG2611061234:654321',
  customerName: 'Alex Nguyen', paidAt: '2026-11-06T10:00:00Z', boxSize: 2,
  items: [{ id: 'item-1', serviceName: 'Everyday laundry', quantity: 1, unitPrice: 80000, subTotal: 80000 }],
  timeline: [{ id: 'event-1', status: 1, timestamp: 1793923200, note: 'Order recorded' }]
}
const envelope = (data) => ({ succeeded: true, data })

async function setup(page, options = {}) {
  const state = { order: { ...initialOrder }, calls: [], cancelCalls: [], lockerCalls: [], failList: false, canCancel: true, cancelFailure: 0 }
  state.pickupSessionMilliseconds = 600000
  state.pickupFailure = 0
  state.rating = null
  state.ratingCalls = []
  state.uploadCalls = 0
  state.ratingFailure = 0
  state.ratingLookupFailure = false
  state.incidents = []
  state.incidentCalls = []
  state.incidentFailure = 0
  state.incidentListFailure = false
  state.eligibility = null
  state.messages = []
  state.videoUploadCalls = 0
  state.feeCalls = []
  if (!options.guest) {
    await page.addInitScript(() => localStorage.setItem('persist:root', JSON.stringify({
      auth: JSON.stringify({ user: { id: 'customer-test', fullName: 'Alex Nguyen', role: 'Customer' }, accessToken: 'test-access', refreshToken: 'test-refresh', expiresAt: '2099-01-01T00:00:00Z' }),
      preferences: JSON.stringify({ language: 'en', serviceTermsSeen: { 'customer-test': true } }), theme: JSON.stringify({ mode: 'light' }), _persist: JSON.stringify({ version: 1, rehydrated: true })
    })))
  }
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '')
    if (path === '/auth/me') {
      return route.fulfill({ json: envelope({ id: 'customer-test', fullName: 'Alex Nguyen', role: 'Customer' }) })
    }
    if (path === '/policy/customer') {
      return route.fulfill({ json: envelope({ terms: { version: 'v1', content: 'Server terms' }, rules: {}, accepted: true, requiresAcceptance: false }) })
    }
    if (['/payment/cancellation-fee/create-url', '/payment/overdue-fee/create-url'].includes(path)) {
      state.feeCalls.push({ path, body: request.postDataJSON() })
      return route.fulfill({ json: envelope({ orderId: id, paymentMethod: request.postDataJSON().paymentMethod, amount: 20000, paymentUrl: 'https://gateway.example.test/fees' }) })
    }
    if (path === '/files/videos') {
      state.videoUploadCalls += 1
      return route.fulfill({ json: envelope({ url: '/uploads/customer-test/evidence.mp4' }) })
    }
    if (path === `/incident/eligibility/${id}`) {
      const event = state.order.timeline?.find((item) => item.status === 12)
      const completedAt = event ? new Date(event.timestamp * 1000) : new Date()
      const expired = Date.now() > completedAt.getTime() + 3 * 86400000
      const pending = state.incidents.find((item) => item.status === 1)
      return route.fulfill({ json: envelope(state.eligibility || { orderId: id, canReport: state.order.status === 12 && !expired && !pending, reason: expired ? 'customer.incidents.expired' : 'customer.incidents.notAllowed', reportDeadline: new Date(completedAt.getTime() + 3 * 86400000).toISOString(), pendingIncidentId: pending?.id }) })
    }
    if (path.startsWith('/incident/mine/request/')) {
      const found = state.incidents.find((item) => path.endsWith(item.clientRequestId))
      return route.fulfill({ status: found ? 200 : 404, json: envelope(found) })
    }
    if (path.endsWith('/messages') && path.startsWith('/incident/')) {
      const incidentId = path.split('/')[2]
      if (request.method() === 'POST') {
        const item = { ...request.postDataJSON(), id: 'message-1', incidentId, isMine: true, senderName: 'Alex', senderRole: 'Customer', createdAt: new Date().toISOString() }
        state.messages.push(item)
        return route.fulfill({ json: envelope(item) })
      }
      return route.fulfill({ json: envelope(state.messages) })
    }
    if (path === `/wash-order/${id}/receipt`) {
      if (state.order.paymentStatus !== 2) {
        return route.fulfill({ status: 400, json: { succeeded: false, message: 'customer.orders.receipt.unavailable' } })
      }
      return route.fulfill({ json: envelope({ receiptNumber: 'WG-RC-0001', issuedAt: '2026-11-06T10:00:00Z', orderId: id, orderCode: state.order.orderCode, seller: { name: 'WashGo Store' }, buyer: { name: 'Alex Nguyen' }, lines: state.order.items.map((item) => ({ description: item.serviceName, quantity: item.quantity, amount: item.subTotal })), fees: [], payments: [{ method: 2, purpose: 1, amount: 80000, paidAt: '2026-11-06T10:00:00Z' }], servicesAmount: 80000, discountAmount: 0, weightSurchargeAmount: 0, totalPaid: 80000, note: 'This is not an electronic or tax invoice.' }) })
    }
    if (path === `/wash-order/${id}/receipt/pdf`) {
      return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4 test fixture' })
    }
    if (path === '/incident/mine/filter') {
      const body = request.postDataJSON()
      expect(body).not.toHaveProperty('customerId')
      const pageNumber = body.page
      const take = body.take
      return route.fulfill({ status: state.incidentListFailure ? 500 : 200, json: state.incidentListFailure ? { succeeded: false, message: 'customer.incidents.invalidResponse' } : {
        succeeded: true, list: state.incidents.slice((pageNumber - 1) * take, pageNumber * take), total: state.incidents.length,
        currentPage: pageNumber, pageSize: take, totalPages: Math.ceil(state.incidents.length / take)
      } })
    }
    if (path === '/incident' && request.method() === 'POST') {
      const body = request.postDataJSON()
      state.incidentCalls.push(body)
      const incident = { ...body, id: `22222222-2222-4222-8222-${String(state.incidentCalls.length).padStart(12, '0')}`, orderCode: state.order.orderCode, createdOn: Math.floor(Date.now() / 1000), status: 1, canEdit: true, compensationStatus: 0, compensationAmount: 0 }
      if (!state.incidentFailure || state.incidentFailure >= 500) {
        state.incidents.unshift(incident)
      }
      return route.fulfill({ status: state.incidentFailure || 201, json: state.incidentFailure ? { succeeded: false, message: 'customer.incidents.invalidResponse' } : envelope(incident) })
    }
    if (path.startsWith('/incident/')) {
      const found = state.incidents.find((item) => path === `/incident/${item.id}` || path === `/incident/${item.id}/withdraw`)
      if (found && request.method() === 'PUT') {
        Object.assign(found, request.postDataJSON())
      }
      if (found && path.endsWith('/withdraw')) {
        Object.assign(found, { status: 4, canEdit: false, withdrawReason: request.postDataJSON().reason })
      }
      if (found) {
        return route.fulfill({ json: envelope(found) })
      }
      const incident = state.incidents.find((item) => path === `/incident/${item.id}`)
      return route.fulfill({ status: incident ? 200 : 404, json: incident ? envelope(incident) : { succeeded: false, message: 'customer.incidents.invalidResponse' } })
    }
    if (path.startsWith('/rating/operations/')) {
      return route.fulfill({ status: 404, json: { succeeded: false } })
    }
    if (path === `/rating/order/${id}`) {
      return route.fulfill({ status: state.ratingLookupFailure ? 500 : 200, json: state.ratingLookupFailure ? { succeeded: false, message: 'customer.rating.invalidResponse' } : envelope(state.rating) })
    }
    if (path === '/files/images') {
      state.uploadCalls += 1
      return route.fulfill({ json: envelope({ url: '/uploads/customer-test/rating.png' }) })
    }
    if (path.startsWith('/uploads/customer-test/') && path.endsWith('.png')) {
      return route.fulfill({ contentType: 'image/png', body: incidentPhoto().buffer })
    }
    if (path === '/rating' && request.method() === 'POST') {
      const body = request.postDataJSON()
      state.ratingCalls.push(body)
      state.rating = { ...body, id: 'rating-1', createdOn: 1793923200 }
      return route.fulfill({ status: state.ratingFailure || 201, json: state.ratingFailure ? { succeeded: false, message: 'customer.rating.uncertain' } : envelope(state.rating) })
    }
    if (path === '/wash-order/mine') {
      const body = request.postDataJSON()
      state.calls.push(body)
      expect(body).not.toHaveProperty('customerId')
      if (state.failList) {
        return route.fulfill({ status: 500, json: { succeeded: false, message: 'customer.orders.invalidResponse' } })
      }
      const list = body.keyword === 'missing' ? [] : [{ ...state.order, orderCode: body.page === 2 ? 'WG2611069999' : state.order.orderCode }]
      return route.fulfill({ json: { succeeded: true, list, currentPage: body.page, pageSize: body.take, total: list.length ? 7 : 0, totalPages: list.length ? 2 : 0 } })
    }
    if (path === `/wash-order/${id}/deposit` || path === `/wash-order/${id}/open-pickup-box` || path === `/wash-order/${id}/confirm-pickup`) {
      const body = request.postDataJSON()
      state.lockerCalls.push({ path, body })
      if (state.pickupFailure) {
        return route.fulfill({ status: state.pickupFailure, json: { succeeded: false, message: 'customer.orders.scan.unknownOutcome' } })
      }
      if (path.endsWith('/confirm-pickup')) {
        expect(body).toEqual({ pickupSessionToken: 'mock-pickup-session-token' })
        state.order = state.order.status === 99 ? { ...state.order, cancelledGoodsStatus: 4 } : { ...state.order, status: 12 }
        return route.fulfill({ json: envelope(state.order) })
      }
      const deposit = path.endsWith('/deposit')
      if (!(body.pinCode === (deposit ? '123456' : '654321') || body.qrCode === (deposit ? initialOrder.qrCodeString : initialOrder.pickupQrCodeString))) {
        return route.fulfill({ status: 400, json: { succeeded: false, message: 'customer.orders.scan.invalidCredentials' } })
      }
      if (deposit) {
        state.order = { ...state.order, status: 2 }
        return route.fulfill({ json: envelope(state.order) })
      }
      return route.fulfill({ json: envelope({ orderId: id, pickupSessionToken: 'mock-pickup-session-token', expiresAt: new Date(Date.now() + state.pickupSessionMilliseconds).toISOString(), returnLockerName: 'Return Locker Riverside', returnBoxNumber: 'B-09' }) })
    }
    if (path === `/wash-order/${id}/pickup-storage`) {
      state.lockerCalls.push({ path, body: request.postDataJSON() })
      state.order = { ...state.order, status: 12 }
      return route.fulfill({ json: envelope(state.order) })
    }
    if (path === `/wash-order/${id}/cancellation-quote`) {
      return route.fulfill({ json: envelope({ orderId: id, canCancel: state.canCancel, reason: 'customer.orders.cancel.notAllowed', feeAmount: 24000, refundAmount: 0, feeOutstanding: 24000, feePercent: 30 }) })
    }
    if (path === `/wash-order/${id}/cancel`) {
      state.cancelCalls.push(request.postDataJSON())
      if (state.cancelFailure) {
        return route.fulfill({ status: state.cancelFailure, json: { succeeded: false, message: 'customer.orders.cancel.notAllowed' } })
      }
      state.order = { ...state.order, status: 99, cancellationReason: request.postDataJSON().reason, cancelFeeAmount: 24000, cancellationRefundAmount: 0, cancellationFeeOutstanding: 24000 }
      return route.fulfill({ json: envelope(state.order) })
    }
    if (path === `/wash-order/${id}`) {
      return route.fulfill({ json: envelope(state.order) })
    }
    if (path.startsWith('/customer/services/filter') || path === '/customer/lockers') {
      return route.fulfill({ json: { succeeded: true, list: [], total: 0, currentPage: 1, totalPages: 0 } })
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return state
}

test('receipt appears only in details and rechecks payment eligibility before printing', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, status: 12, paymentStatus: 2 }
  await page.goto('/customer/orders')
  const action = page.getByRole('button', { name: 'Payment printout', exact: true })
  await expect(page.getByRole('heading', { name: initialOrder.orderCode, exact: true })).toBeVisible()
  await expect(action).toHaveCount(0)
  await page.getByRole('button', { name: 'Details', exact: true }).click()
  await expect(action).toBeVisible()
  state.order = { ...state.order, paymentStatus: 1 }
  await action.click()
  const dialog = page.getByRole('dialog', { name: 'Payment printout', exact: true })
  await expect(dialog.getByRole('alert')).toContainText('A printout is available only after the order is completed and paid.')
  await expect(dialog.getByRole('button', { name: 'Print receipt', exact: true })).toBeDisabled()
  await expect(page.locator('[data-receipt-print]')).toHaveCount(0)
  await expect(page).toHaveURL(`/customer/orders/${id}`)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await expect(dialog).toHaveCount(0)
})

test('receipt modal stays usable on mobile in both themes and prints long documents without clipping', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, status: 12, paymentStatus: 2, items: Array.from({ length: 30 }, (_, index) => ({ ...initialOrder.items[0], id: `item-${index}`, serviceName: `Laundry service ${index + 1}` })) }
  await page.goto(`/customer/orders/${id}`)
  const action = page.getByRole('button', { name: 'Payment printout', exact: true })
  const refresh = page.getByRole('button', { name: 'Refresh', exact: true })
  expect((await action.boundingBox()).height).toBe((await refresh.boundingBox()).height)
  await page.setViewportSize({ width: 375, height: 667 })
  for (const dark of [false, true]) {
    await page.evaluate((enabled) => document.documentElement.classList.toggle('dark', enabled), dark)
    await action.click()
    const dialog = page.getByRole('dialog', { name: 'Payment printout', exact: true })
    const print = dialog.getByRole('button', { name: 'Print receipt', exact: true })
    await expect(print).toBeEnabled()
    await expect(print).toBeInViewport()
    expect((await print.boundingBox()).height).toBe(48)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.emulateMedia({ media: 'print' })
    const copy = page.locator('[data-receipt-print]')
    await expect(copy.getByText('Laundry service 30', { exact: true })).toBeVisible()
    await expect(copy).toHaveJSProperty('scrollHeight', await copy.evaluate((element) => element.clientHeight))
    await expect(page.locator('#main-content')).toBeHidden()
    await page.emulateMedia({ media: 'screen' })
    await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
    await expect(dialog).toHaveCount(0)
  }
})

test('desktop keeps all navigation links while tablet and mobile use the menu', async ({ page }) => {
  await setup(page)
  await page.goto('/customer')
  const nav = page.locator('header nav').first()
  const menu = page.getByRole('button', { name: 'Open navigation menu', exact: true })
  for (const width of [1024, 1100, 1279, 1440, 1585]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('link')).toHaveCount(5)
    await expect(nav.getByRole('link').first()).toHaveCSS('font-size', '16px')
    await expect(menu).toBeHidden()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Change language', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  await page.setViewportSize({ width: 1024, height: 900 })
  await expect(nav.getByRole('link')).toHaveCount(5)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const width of [991, 768, 375]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(nav).toBeHidden()
    await expect(page.locator('header button[aria-controls="customer-mobile-navigation"]')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.locator('header button[aria-controls="customer-mobile-navigation"]').click()
  await page.locator('#customer-mobile-navigation').getByRole('link', { name: 'Đơn hàng của tôi', exact: true }).click()
  await expect(page).toHaveURL('/customer/orders')
  await expect(page.locator('#customer-mobile-navigation')).toHaveCount(0)
})

test('my orders preserves server filters, paging, sorting, badges and error retry', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/customer/orders?status=8&paymentStatus=1&page=2')
  await expect(page.getByRole('heading', { name: 'WG2611069999', exact: true })).toBeVisible()
  expect(state.calls.at(-1)).toMatchObject({ status: 8, paymentStatus: 1, page: 2 })
  await page.getByRole('combobox', { name: 'Sort orders', exact: true }).click()
  await page.getByRole('option', { name: 'Oldest first', exact: true }).click()
  await expect.poll(() => state.calls.at(-1)).toMatchObject({ page: 1, sortBy: [{ field: 'CreatedOn', isDescending: false }] })
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect.poll(() => state.calls.at(-1).page).toBe(2)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'WG2611069999', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Remove filter Awaiting payment', exact: true }).click()
  await expect.poll(() => state.calls.at(-1).status).toBeUndefined()
  expect(state.calls.at(-1).paymentStatus).toBe(1)
  await page.goBack()
  await expect(page.getByRole('combobox', { name: 'Order status', exact: true })).toContainText('Awaiting payment')
  state.failList = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Unable to read the order information')
  state.failList = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'WG2611069999', exact: true })).toBeVisible()
  await page.getByRole('combobox').first().fill('missing')
  await page.getByRole('search', { name: 'Search orders', exact: true }).locator('button[type="submit"]').click()
  await expect(page.getByText('No matching orders. Try different filters.', { exact: true })).toBeVisible()
})

test('order detail renders service and both locker photos supplied by its DTO', async ({ page }) => {
  const state = await setup(page)
  const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMC/wCfyO0AAAAASUVORK5CYII='
  state.order = { ...state.order, lockerImageUrls: [photo], returnLockerName: 'Return station', returnLockerImageUrls: [photo], items: state.order.items.map((item) => ({ ...item, serviceImageUrls: [photo] })) }
  await page.goto(`/customer/orders/${id}`)
  for (const name of ['Everyday laundry', 'Ben Thanh Locker', 'Return station']) {
    const image = page.getByRole('img', { name, exact: true })
    await image.scrollIntoViewIfNeeded()
    await expect(image).toBeVisible()
    await expect(image).toHaveJSProperty('naturalWidth', 1)
  }
})

test('order detail shows real history, masks PIN and confirms server cancellation fees', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/customer/orders')
  await page.getByRole('button', { name: 'Details', exact: true }).click()
  await expect(page).toHaveURL(`/customer/orders/${id}`)
  await expect(page.getByText('Order recorded', { exact: true })).toBeVisible()
  await expect(page.getByText('123456', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Show drop-off PIN', exact: true }).click()
  await expect(page.getByText('123456', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pay now', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Estimated cancellation fee', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Confirm cancellation', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Please enter a cancellation reason.')
  expect(state.cancelCalls).toHaveLength(0)
  await dialog.getByRole('textbox', { name: 'Cancellation reason', exact: true }).fill('Plans changed')
  await dialog.getByRole('button', { name: 'Confirm cancellation', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Cancelled', { exact: true }).first()).toBeVisible()
  expect(state.cancelCalls).toEqual([{ reason: 'Plans changed' }])
  await expect(page.getByRole('button', { name: 'Cancel order', exact: true })).toHaveCount(0)
  await expect(page.getByText('123456', { exact: true })).toHaveCount(0)
  const saved = await page.evaluate(() => localStorage.getItem('persist:root'))
  expect(saved).not.toContain('123456')
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await expect(page.getByText('Plans changed', { exact: false })).toBeVisible()
})

test('cancellation rejects stale eligibility and locks unknown results; payment is reachable when eligible', async ({ page }) => {
  const state = await setup(page)
  state.canCancel = false
  await page.goto(`/customer/orders/${id}`)
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Confirm cancellation', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  state.canCancel = true
  state.cancelFailure = 500
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Cancellation reason', exact: true }).fill('Plans changed')
  await dialog.getByRole('button', { name: 'Confirm cancellation', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('cancellation outcome is unknown')
  await expect(dialog.getByRole('button', { name: 'Confirm cancellation', exact: true })).toBeDisabled()
  expect(state.cancelCalls).toHaveLength(1)
  await page.keyboard.press('Escape')
  state.order = { ...state.order, status: 8, actualWeightKg: 3 }
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByRole('button', { name: 'Pay now', exact: true }).click()
  await expect(page).toHaveURL(`/customer/orders/${id}/payment`)
  await expect(page.getByRole('heading', { name: 'Order payment', exact: true })).toBeVisible()
})

test('guest cannot access customer orders', async ({ page }) => {
  await setup(page, { guest: true })
  await page.goto('/customer/orders')
  await expect(page).toHaveURL('/login')
})

async function downloadQr(page) {
  await page.getByRole('button', { name: 'Show QR code', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download QR code', exact: true }).click()
  const download = await pending
  expect(download.suggestedFilename()).toMatch(/\.png$/)
  const stream = await download.createReadStream()
  const parts = []
  for await (const part of stream) {
    parts.push(part)
  }
  return Buffer.concat(parts)
}

test('real generated QR image decodes locally and only submits after confirmation', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/customer/orders/${id}`)
  const png = await downloadQr(page)
  await page.getByRole('button', { name: 'Drop off at locker', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Drop off at locker', exact: true })).toBeVisible()
  const confirmDropoff = dialog.getByRole('button', { name: 'I have placed my items and closed the door', exact: true })
  await expect(confirmDropoff).toBeDisabled()
  await expect(dialog.getByText('Place your laundry inside and close the door', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Ben Thanh Locker', { exact: true })).toBeVisible()
  await dialog.getByRole('radio', { name: 'QR', exact: true }).click()
  await dialog.getByLabel('Upload QR image', { exact: true }).setInputFiles({ name: 'deposit.png', mimeType: 'image/png', buffer: png })
  await expect(dialog.getByRole('status')).toContainText('QR code for this order is ready')
  await expect(confirmDropoff).toBeEnabled()
  expect(state.lockerCalls).toHaveLength(0)
  await dialog.getByRole('button', { name: 'I have placed my items and closed the door', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.lockerCalls).toEqual([{ path: `/wash-order/${id}/deposit`, body: { qrCode: initialOrder.qrCodeString } }])
  await expect(page.getByRole('heading', { name: 'Drop-off QR and PIN', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Drop off at locker', exact: true })).toHaveCount(0)
})

test('order navigation returns to the top and the drop-off action sits beside the title', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/customer')
  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100)
  await page.locator('header nav').getByRole('link', { name: 'My orders', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'My orders', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  await page.locator('footer').scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Details', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Order details WG2611061234', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
  const title = await page.getByRole('heading', { name: 'Order details WG2611061234', exact: true }).boundingBox()
  const action = page.getByRole('button', { name: 'Drop off at locker', exact: true })
  const box = await action.boundingBox()
  const refresh = await page.getByRole('button', { name: 'Refresh', exact: true }).boundingBox()
  expect(Math.abs(box.height - refresh.height)).toBeLessThan(1)
  expect(Math.abs(box.y - refresh.y)).toBeLessThan(1)
  expect(box.x).toBeGreaterThan(title.x + title.width)
  expect(Math.abs(box.y - title.y)).toBeLessThan(55)
  await expect(page.getByRole('button', { name: 'Simulate locker', exact: true })).toHaveCount(0)
  await action.click()
  const dialog = page.getByRole('dialog')
  const current = page.locator('li[aria-current="step"]')
  await expect(current.locator('time')).toHaveCount(0)
  const pinInputs = dialog.getByRole('group', { name: 'Enter the 6-digit PIN', exact: true }).locator('input')
  await expect(pinInputs).toHaveCount(6)
  const submit = dialog.getByRole('button', { name: 'I have placed my items and closed the door', exact: true })
  await expect(submit).toBeDisabled()
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('123')
  await expect(submit).toBeDisabled()
  expect(state.lockerCalls).toHaveLength(0)
  const close = await dialog.getByRole('button', { name: 'Close', exact: true }).last().boundingBox()
  const confirm = await dialog.getByRole('button', { name: 'I have placed my items and closed the door', exact: true }).boundingBox()
  expect(Math.abs(close.y - confirm.y)).toBeLessThan(1)
  expect(Math.abs(close.height - confirm.height)).toBeLessThan(1)
  expect(Math.abs(confirm.x - close.x - close.width - 8)).toBeLessThan(1)
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('000000')
  await expect(submit).toBeEnabled()
  await dialog.getByRole('button', { name: 'I have placed my items and closed the door', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('PIN or QR code is incorrect')
  expect(state.order.status).toBe(1)
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('123456')
  await dialog.getByRole('button', { name: 'I have placed my items and closed the door', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.order.status).toBe(2)
  await expect(page.locator('li').filter({ hasText: 'Order recorded' }).locator('time')).toHaveCount(1)
  await expect(page.locator('li[aria-current="step"] time')).toHaveCount(0)
})

test('pickup uses a private two-step session, then unlocks a safe printable receipt', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...state.order, status: 10, paymentStatus: 2 }
  await page.addInitScript(() => {
    window.print = () => {
      window.__printCalls = (window.__printCalls || 0) + 1
    }
  })
  await page.goto(`/customer/orders/${id}`)
  await expect(page).toHaveTitle('Order details WG2611061234 | WashGo')
  await page.getByRole('button', { name: 'Collect from locker', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('000000')
  await dialog.getByRole('button', { name: 'Open pickup compartment', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('PIN or QR code is incorrect')
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('654321')
  await dialog.getByRole('button', { name: 'Open pickup compartment', exact: true }).click()
  await expect(dialog.getByText('Pickup session opened', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Return Locker Riverside', { exact: false })).toBeVisible()
  await expect(dialog.getByText('Session time remaining', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('radio')).toHaveCount(0)
  expect(state.order.status).toBe(10)
  await dialog.getByRole('button', { name: 'Collected items and closed door', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Payment printout', exact: true }).click()
  const receipt = page.getByRole('dialog', { name: 'Payment printout', exact: true })
  await expect(page).toHaveURL(`/customer/orders/${id}`)
  await expect(receipt.getByRole('heading', { name: 'Payment receipt', exact: true })).toBeVisible()
  await expect(receipt.getByText('This is not an electronic or tax invoice.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Print receipt', exact: true }).click()
  expect(await page.evaluate(() => window.__printCalls)).toBe(1)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('header').first()).toBeHidden()
  await expect(page.locator('footer')).toBeHidden()
  await expect(page.locator('[data-receipt-print] article')).toBeVisible()
  await expect(page.locator('[data-receipt-print]')).not.toContainText('654321')
  await expect(page.locator('[data-receipt-print]')).not.toContainText('mock-pickup-session-token')
  await expect(page.locator('#main-content')).toBeHidden()
  await page.emulateMedia({ media: 'screen' })
  await receipt.getByRole('button', { name: 'Close', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'Order details WG2611061234', exact: true })).toBeVisible()
  await expect(page.locator('[data-receipt-print]')).toHaveCount(0)
  const saved = await page.evaluate(() => localStorage.getItem('persist:root'))
  expect(saved).not.toContain('654321')
  expect(saved).not.toContain('mock-pickup-session-token')
})

test('pickup button follows lifecycle and a QR session expires without completing the order', async ({ page }) => {
  const state = await setup(page)
  const pickupButton = page.getByRole('button', { name: 'Collect from locker', exact: true })
  for (const [status, paymentStatus] of [[8, 1], [9, 2], [10, 1], [12, 2], [13, 2], [99, 2]]) {
    state.order = { ...initialOrder, status, paymentStatus }
    await page.goto(`/customer/orders/${id}`)
    await expect(page.getByRole('heading', { name: 'Order details WG2611061234', exact: true })).toBeVisible()
    await expect(pickupButton).toHaveCount(0)
  }
  state.order = { ...initialOrder, status: 10, paymentStatus: 2, returnBoxNumber: 'B-09' }
  await page.goto(`/customer/orders/${id}`)
  const png = await downloadQr(page)
  await pickupButton.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Your laundry is ready for pickup', { exact: true })).toBeVisible()
  await dialog.getByRole('radio', { name: 'QR', exact: true }).click()
  const open = dialog.getByRole('button', { name: 'Open pickup compartment', exact: true })
  await expect(open).toBeDisabled()
  await dialog.getByLabel('Upload QR image', { exact: true }).setInputFiles({ name: 'pickup.png', mimeType: 'image/png', buffer: png })
  await expect(open).toBeEnabled()
  expect(state.lockerCalls).toHaveLength(0)
  await page.clock.install()
  state.pickupSessionMilliseconds = 1000
  await open.click()
  await expect(dialog.getByText('Pickup session opened', { exact: true })).toBeVisible()
  await page.clock.fastForward(2000)
  await expect(dialog.getByRole('alert')).toContainText('pickup session has expired')
  await expect(dialog.getByRole('button', { name: 'Collected items and closed door', exact: true })).toHaveCount(0)
  expect(state.order.status).toBe(10)
  expect(state.lockerCalls).toHaveLength(1)
  expect(state.lockerCalls[0].body).toEqual({ qrCode: initialOrder.pickupQrCodeString })
  await dialog.getByRole('button', { name: 'Authenticate again', exact: true }).click()
  await expect(dialog.getByRole('radio', { name: 'PIN', exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Open pickup compartment', exact: true })).toBeDisabled()
})

test('unknown pickup outcomes lock submission and localized tab titles include the order code', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, status: 10, paymentStatus: 2 }
  state.pickupFailure = 503
  await page.goto(`/customer/orders/${id}`)
  await page.getByRole('button', { name: 'Collect from locker', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('654321')
  const open = dialog.getByRole('button', { name: 'Open pickup compartment', exact: true })
  await open.click()
  await expect(dialog.getByRole('alert')).toContainText('operation outcome is unknown')
  await expect(open).toBeDisabled()
  expect(state.lockerCalls).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Change language', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  await expect(page).toHaveTitle('Chi tiết đơn hàng WG2611061234 | WashGo')
})

test('QR uploads reject wrong purpose and malformed images; camera starts only on request', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...state.order, status: 10, paymentStatus: 2 }
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => {
        window.__cameraCalls = (window.__cameraCalls || 0) + 1; throw new DOMException('Denied', 'NotAllowedError')
      },
      enumerateDevices: async () => [], addEventListener() {}, removeEventListener() {}
    } })
  })
  await page.goto(`/customer/orders/${id}`)
  const wrongQr = await downloadQr(page)
  state.order = { ...initialOrder }
  await page.reload()
  await page.getByRole('button', { name: 'Drop off at locker', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: 'QR', exact: true }).click()
  await dialog.getByLabel('Upload QR image', { exact: true }).setInputFiles({ name: 'wrong.png', mimeType: 'image/png', buffer: wrongQr })
  await expect(dialog.getByRole('alert')).toContainText('does not match the order')
  await expect(dialog.getByRole('button', { name: 'I have placed my items and closed the door', exact: true })).toBeDisabled()
  await dialog.getByLabel('Upload QR image', { exact: true }).setInputFiles({ name: 'invalid.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(dialog.getByRole('alert').last()).toContainText('PNG, JPG or WEBP')
  expect(await page.evaluate(() => window.__cameraCalls || 0)).toBe(0)
  await dialog.getByRole('button', { name: 'Scan with camera', exact: true }).click()
  await expect(dialog.getByRole('alert').last()).toContainText('Unable to open the camera')
  expect(await page.evaluate(() => window.__cameraCalls)).toBeGreaterThan(0)
  expect(state.lockerCalls).toHaveLength(0)
})

test('receipt rejects unpaid orders and filter controls share the same horizontal center line', async ({ page }) => {
  await setup(page)
  await page.goto(`/customer/orders/${id}/receipt`)
  await expect(page.getByText('A printout is available only after the order is completed and paid.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print receipt', exact: true })).toHaveCount(0)
  await page.goto('/customer/orders')
  for (const width of [1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const boxes = await Promise.all([
      page.getByRole('search', { name: 'Search orders', exact: true }).boundingBox(),
      page.getByRole('combobox', { name: 'Order status', exact: true }).boundingBox(),
      page.getByRole('combobox', { name: 'Payment status', exact: true }).boundingBox(),
      page.getByRole('button', { name: 'Refresh', exact: true }).boundingBox()
    ])
    const centers = boxes.map((box) => box.y + box.height / 2)
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(2)
    expect(boxes[0].x).toBeLessThan(boxes[1].x)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('completed orders can submit a rating with optional criteria and uploaded photos, then view it', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, status: 12, paymentStatus: 2 }
  await page.goto('/customer/orders')
  await expect(page.getByRole('heading', { name: 'Order list', exact: true })).toBeVisible()
  await page.goto(`/customer/orders/${id}`)
  await page.getByRole('button', { name: 'Rate service', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Submit rating', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Choose 1 to 5 stars')
  expect(state.ratingCalls).toHaveLength(0)
  await dialog.getByRole('group', { name: 'Overall rating', exact: true }).getByRole('button', { name: 'Overall rating: 5/5 stars', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Submit rating', exact: true })).toBeInViewport()
  await dialog.getByText('Rate individual criteria (optional)', { exact: true }).click()
  await dialog.getByRole('button', { name: 'Laundry quality: 4/5 stars', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Share your experience (optional)', exact: true }).fill('Clean and carefully packed')
  const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=', 'base64')
  await dialog.getByLabel('Add photos', { exact: true }).setInputFiles({ name: 'shirt.png', mimeType: 'image/png', buffer: photo })
  await expect(dialog.getByRole('img', { name: 'Attached photo 1', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Submit rating', exact: true }).click()
  await expect(dialog.getByText('Thank you! Your rating has been saved.', { exact: true })).toBeVisible()
  expect(state.uploadCalls).toBe(1)
  expect(state.ratingCalls).toHaveLength(1)
  expect(state.ratingCalls[0]).toEqual({ operationId: expect.any(String), orderId: id, overallStars: 5, qualityStars: 4, speedStars: null, attitudeStars: null, packagingStars: null, comment: 'Clean and carefully packed', imageUrls: ['/uploads/customer-test/rating.png'], videoUrls: [] })
  await expect(dialog.getByRole('button', { name: 'Submit rating', exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'View your rating', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rate service', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'View your rating', exact: true }).click()
  await expect(dialog.getByText('Clean and carefully packed', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('textbox')).toHaveCount(0)
  expect(state.ratingCalls).toHaveLength(1)
})

test('rating lookup errors retry safely and uncertain submissions require checking the saved rating', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/customer/orders/${id}`)
  await expect(page.getByRole('heading', { name: 'Order details WG2611061234', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rate service', exact: true })).toHaveCount(0)
  state.order = { ...initialOrder, status: 12 }
  state.ratingLookupFailure = true
  await page.reload()
  await page.getByRole('button', { name: 'Check saved rating', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Submit rating', exact: true })).toHaveCount(0)
  state.ratingLookupFailure = false
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click()
  await dialog.getByRole('button', { name: 'Overall rating: 3/5 stars', exact: true }).click()
  state.ratingFailure = 503
  await dialog.getByRole('button', { name: 'Submit rating', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Submit rating', exact: true })).toBeDisabled()
  expect(state.ratingCalls).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Check saved rating', exact: true }).click()
  await expect(dialog.getByText('Thank you! Your rating has been saved.', { exact: true })).toBeVisible()
  expect(state.ratingCalls).toHaveLength(1)
})

test('rating validates photos and stays usable on mobile in both languages and dark mode', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, status: 12 }
  await page.setViewportSize({ width: 375, height: 844 })
  await page.goto(`/customer/orders/${id}`)
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await page.getByRole('button', { name: 'Rate service', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Add photos', { exact: true }).setInputFiles({ name: 'wrong.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(state.uploadCalls).toBe(0)
  await dialog.getByLabel('Add photos', { exact: true }).setInputFiles(Array.from({ length: 6 }, (_, index) => ({ name: `photo-${index}.png`, mimeType: 'image/png', buffer: Buffer.from('image') })))
  await expect(dialog.getByRole('alert')).toContainText('up to 5 photos')
  expect(state.uploadCalls).toBe(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Change language', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  await page.getByRole('button', { name: 'Đánh giá dịch vụ', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Đánh giá dịch vụ', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Gửi đánh giá', exact: true }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('button', { name: 'Gửi đánh giá', exact: true })).toBeInViewport()
  await expect(dialog.getByRole('heading', { name: 'Đánh giá dịch vụ', exact: true })).toBeInViewport()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('saved rating keeps its header and close action visible with long content on small screens', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, status: 12 }
  state.rating = { id: 'rating-1', orderId: id, overallStars: 5, qualityStars: 4, speedStars: 5, attitudeStars: 5, packagingStars: 4, comment: 'Carefully packed. '.repeat(50), imageUrls: [], createdOn: 1793923200 }
  await page.goto(`/customer/orders/${id}`)
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 667 })
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), width === 320)
    await page.getByRole('button', { name: /^(Rate service|View your rating)$/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'View your rating', exact: true })).toBeInViewport()
    const close = dialog.getByRole('button', { name: 'Close', exact: true }).last()
    await expect(close).toBeInViewport()
    expect((await close.boundingBox()).height).toBe(44)
    await expect(dialog.getByRole('group', { name: 'Overall rating', exact: true })).toContainText('5/5')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await close.click()
    await expect(dialog).toHaveCount(0)
  }
  expect(state.ratingCalls).toHaveLength(0)
})

const incidentPhoto = () => ({ name: 'evidence.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=', 'base64') })
const completedForIncident = () => ({ ...initialOrder, status: 12, timeline: [{ id: 'completed', status: 12, timestamp: Math.floor(Date.now() / 1000) }] })

test('customer incident report validates evidence, submits allowed fields and opens its complaint details', async ({ page }) => {
  const state = await setup(page)
  state.order = completedForIncident()
  await page.goto(`/customer/orders/${id}`)
  await page.getByRole('button', { name: 'Report an issue', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Report an issue', exact: true })
  const submit = dialog.getByRole('button', { name: 'Submit report', exact: true })
  await submit.click()
  await expect(dialog.getByRole('alert')).toContainText('Please describe the issue')
  await dialog.getByRole('textbox', { name: 'Describe the issue', exact: true }).fill('  My shirt was damaged.  ')
  await submit.click()
  await expect(dialog.getByRole('alert')).toContainText('Add at least one supporting photo')
  expect(state.incidentCalls).toHaveLength(0)
  await dialog.getByRole('combobox', { name: 'Issue type', exact: true }).click()
  await page.getByRole('option', { name: 'Damaged items', exact: true }).click()
  await dialog.getByRole('combobox', { name: 'Impact level', exact: true }).click()
  await page.getByRole('option', { name: 'Severe', exact: true }).click()
  await dialog.getByLabel('Add photos', { exact: true }).setInputFiles(incidentPhoto())
  await expect(dialog.getByRole('img', { name: 'Attached photo 1', exact: true })).toBeVisible()
  await submit.click()
  await expect(page).toHaveURL(/\/customer\/complaints\/22222222-/)
  await expect(page.getByRole('heading', { name: 'Complaint details', exact: true })).toBeVisible()
  await expect(page).toHaveTitle(/Complaint details - WG2611061234/)
  expect(state.incidentCalls).toEqual([{ orderId: id, type: 1, severity: 3, description: 'My shirt was damaged.', imageUrls: ['/uploads/customer-test/rating.png'], videoUrls: [], clientRequestId: expect.any(String) }])
  expect(state.uploadCalls).toBe(1)
  await expect(page.getByText('My shirt was damaged.', { exact: true })).toBeVisible()
  await expect(page.getByText('Pending review', { exact: true })).toBeVisible()
  await expect(page.getByText('Report submitted. Track the outcome in your complaint details.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Back to complaints', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'My complaints', exact: true })).toBeVisible()
  await expect(page.getByRole('table').getByText('Damaged items', { exact: true })).toBeVisible()
})

test('customer complaint list uses real pagination, shows resolution and payout, and retries read errors', async ({ page }) => {
  const state = await setup(page)
  state.incidents = Array.from({ length: 7 }, (_, index) => ({ id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, '0')}`, orderId: id, orderCode: `WG-ISSUE-${index + 1}`, type: 2, severity: 3, status: 2, description: `Lost item ${index + 1}`, createdOn: 1793923200, reviewedAt: '2026-11-06T10:00:00Z', resolutionNote: 'Compensation approved.', responsibleParty: 1, compensationAmount: 140000, itemValue: 200000, compensationStatus: 2, compensationReference: 'BANK-123', compensationPaidAt: '2026-11-06T11:00:00Z', imageUrls: [] }))
  await page.goto('/customer/complaints?page=2')
  await expect(page.getByText('WG-ISSUE-7', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Previous page', exact: true }).click()
  await expect(page).toHaveURL('/customer/complaints')
  await expect(page.getByText('WG-ISSUE-1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Complaint actions', exact: true }).first().click()
  await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
  await expect(page.getByText('Compensation approved.', { exact: true })).toBeVisible()
  await expect(page.getByText('Paid out', { exact: true })).toBeVisible()
  await expect(page.getByText('BANK-123', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Compensation approved.', { exact: true })).toBeVisible()
  await page.goto('/customer/complaints/33333333-3333-4333-8333-333333333333')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('BANK-123', { exact: true })).toHaveCount(0)
  state.incidentListFailure = true
  await page.goto('/customer/complaints')
  await expect(page.getByRole('alert')).toBeVisible()
  state.incidentListFailure = false
  state.eligibility = null
  state.messages = []
  state.videoUploadCalls = 0
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('WG-ISSUE-1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Manage complaints', exact: true }).click()
  await expect(page).toHaveURL('/customer/complaints')
})

test('customer incident submission locks unknown results and preserves uploaded URLs on a rejected retry', async ({ page }) => {
  const state = await setup(page)
  state.order = completedForIncident()
  await page.goto(`/customer/orders/${id}`)
  await page.getByRole('button', { name: 'Report an issue', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Report an issue', exact: true })
  await dialog.getByRole('textbox', { name: 'Describe the issue', exact: true }).fill('Lost shirt')
  await dialog.getByLabel('Add photos', { exact: true }).setInputFiles(incidentPhoto())
  state.incidentFailure = 400
  await dialog.getByRole('button', { name: 'Submit report', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(state.uploadCalls).toBe(1)
  state.incidentFailure = 503
  await dialog.getByRole('button', { name: 'Submit report', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('outcome is unknown')
  await expect(dialog.getByRole('button', { name: 'Submit report', exact: true })).toBeDisabled()
  expect(state.incidentCalls).toHaveLength(2)
  expect(state.uploadCalls).toBe(1)
  await dialog.getByRole('link', { name: 'View submitted complaints', exact: true }).click()
  await expect(page.getByRole('table').getByText('Lost items', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('table').getByText('Damaged items', { exact: true })).toBeVisible()
  expect(state.incidentCalls).toHaveLength(2)
})

test('customer incident modal supports mobile, languages and expiration without inventing eligibility', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/customer/orders/${id}`)
  await expect(page.getByRole('heading', { name: 'Order details WG2611061234', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Report an issue', exact: true })).toHaveCount(0)
  state.order = completedForIncident()
  await page.reload()
  await page.setViewportSize({ width: 320, height: 667 })
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await page.getByRole('button', { name: 'Report an issue', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Submit report', exact: true })).toBeInViewport()
  await expect(dialog.getByRole('heading', { name: 'Report an issue', exact: true })).toBeInViewport()
  await dialog.getByRole('textbox', { name: 'Describe the issue', exact: true }).fill('a'.repeat(2000))
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  state.order = { ...completedForIncident(), timeline: [{ status: 12, timestamp: Math.floor(Date.now() / 1000) - 4 * 86400 }] }
  await page.reload()
  await page.getByRole('button', { name: 'Change language', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Báo cáo sự cố', exact: true })).toBeDisabled()
  await expect(page.getByText('Đơn hàng đã quá thời hạn báo cáo 3 ngày kể từ khi nhận đồ.', { exact: true })).toBeVisible()
  expect(state.incidentCalls).toHaveLength(0)
})

test('customer complaints shows an empty state with a way to find a completed order', async ({ page }) => {
  await setup(page)
  await page.goto('/customer/complaints')
  await expect(page.getByText('You have no complaints yet.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Report from an order', exact: true })).toBeVisible()
})

test('customer complaints protects guest access', async ({ page }) => {
  await setup(page, { guest: true })
  await page.goto('/customer/complaints')
  await expect(page).toHaveURL(/\/login/)
})

test('customer complaint rejected outcomes stay readable on mobile in both languages', async ({ page }) => {
  const state = await setup(page)
  const incidentId = '22222222-2222-4222-8222-000000000001'
  state.incidents = [{ id: incidentId, orderId: id, orderCode: initialOrder.orderCode, type: 3, severity: 2, status: 3, description: 'Items need inspection. '.repeat(70), createdOn: 1793923200, reviewedAt: '2026-11-06T10:00:00Z', resolutionNote: 'Supporting photo does not match the reported item.', compensationAmount: 0, compensationStatus: 0, imageUrls: [] }]
  await page.setViewportSize({ width: 320, height: 667 })
  await page.goto('/customer/complaints')
  await expect(page.getByText('Rejected', { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Complaint actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
  await expect(page.getByText('Supporting photo does not match the reported item.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await page.getByRole('button', { name: 'Change language', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Chi tiết khiếu nại', exact: true })).toBeVisible()
  await expect(page.getByText('Đã từ chối', { exact: true })).toBeVisible()
  await expect(page).toHaveTitle(`Chi tiết khiếu nại - ${initialOrder.orderCode} | WashGo`)
  await expect(page.locator('body')).not.toContainText(incidentId)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('complaints table stacks evidence, opens all photos, and places detail actions together', async ({ page }) => {
  const state = await setup(page)
  const incidentId = '22222222-2222-4222-8222-000000000001'
  state.incidents = [{ id: incidentId, orderId: id, orderCode: initialOrder.orderCode, type: 1, severity: 2, status: 1, description: 'A sleeve was torn during cleaning. '.repeat(8), createdOn: 1793923200, compensationAmount: 0, compensationStatus: 0, imageUrls: Array.from({ length: 4 }, (_, index) => `/uploads/customer-test/evidence-${index + 1}.png`) }]
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/customer/complaints')
  const table = page.getByRole('table', { name: 'My complaints', exact: true })
  await expect(table).toBeVisible()
  await expect(table.getByRole('columnheader')).toHaveCount(7)
  const detailAction = table.getByRole('button', { name: 'Complaint actions', exact: true })
  await expect(detailAction).toHaveText('')
  const images = table.getByRole('button', { name: 'View 4 photos', exact: true })
  await expect(images).toHaveText('2+')
  await expect(images.locator('img')).toHaveCount(2)
  await images.click()
  const gallery = page.getByRole('dialog', { name: 'Attached photos', exact: true })
  await expect(gallery.getByRole('img')).toHaveCount(4)
  await gallery.getByRole('button', { name: 'Close', exact: true }).last().click()
  await table.getByRole('button', { name: 'Complaint actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
  const back = page.getByRole('button', { name: 'Back to complaints', exact: true })
  const refresh = page.getByRole('button', { name: 'Refresh', exact: true })
  await expect(back).toBeVisible()
  const backBox = await back.boundingBox()
  const refreshBox = await refresh.boundingBox()
  expect(backBox.height).toBe(44)
  expect(backBox.y).toBe(refreshBox.y)
  await expect(page.locator('body')).not.toContainText(incidentId)
  await expect(page.getByRole('navigation', { name: 'Breadcrumb', exact: true })).toHaveCSS('font-size', '16px')
  await back.click()
  await page.setViewportSize({ width: 375, height: 844 })
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const region = page.getByRole('region', { name: 'My complaints', exact: true })
  expect(await region.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
  await table.getByRole('button', { name: 'View 4 photos', exact: true }).click()
  await expect(gallery.getByRole('img')).toHaveCount(4)
  await expect(gallery.getByRole('button', { name: 'Close', exact: true }).last()).toBeInViewport()
})

test('result counts are prominent and hot toasts keep localized text, theme and dismiss controls', async ({ page }) => {
  const state = await setup(page)
  state.incidents = [{ id: '22222222-2222-4222-8222-000000000001', orderId: id, orderCode: initialOrder.orderCode, type: 1, severity: 1, status: 1, description: 'Damaged shirt', createdOn: 1793923200, imageUrls: [] }]
  await page.goto('/customer/orders')
  const orderCount = page.getByRole('status').filter({ hasText: '7 orders found' }).locator('strong')
  await expect(orderCount).toHaveText('7')
  await expect(orderCount).toHaveCSS('font-size', '24px')
  await expect(orderCount).toHaveCSS('font-weight', '700')
  await page.goto('/customer/complaints')
  const complaintCount = page.getByRole('status').filter({ hasText: '1 complaint submitted' }).locator('strong')
  await expect(complaintCount).toHaveText('1')
  await expect(complaintCount).toHaveCSS('font-size', '24px')
  await expect(complaintCount).toHaveCSS('font-weight', '700')
  await page.locator('footer').getByRole('button', { name: 'Privacy', exact: true }).click()
  const toaster = page.locator('[data-rht-toaster]')
  const english = toaster.getByText('This content is being updated.', { exact: true })
  await expect(english).toBeVisible()
  const lightBackground = await english.locator('..').evaluate((element) => getComputedStyle(element).backgroundColor)
  await toaster.getByRole('button', { name: 'Close notification', exact: true }).click()
  await expect(english).toHaveCount(0)
  await page.setViewportSize({ width: 375, height: 844 })
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await page.getByRole('button', { name: 'Change language', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  await page.locator('footer').getByRole('button', { name: 'Quyền riêng tư', exact: true }).click()
  const vietnamese = toaster.getByText('Nội dung này đang được cập nhật.', { exact: true })
  await expect(vietnamese).toBeVisible()
  expect(await vietnamese.locator('..').evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(lightBackground)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await toaster.getByRole('button', { name: 'Đóng thông báo', exact: true }).click()
  await expect(vietnamese).toHaveCount(0)
})

test('server deadline expires despite device date; workflow, prediction and return map use server fields', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, progressPercent: 35, serverNow: '2026-11-01T10:00:00Z', depositDeadline: '2026-11-01T10:00:02Z', depositWindowMinutes: 45, predictionStatus: 'predicted', predictedFinishAt: '2026-11-08T10:00:00Z', returnLockerName: 'Riverside pickup', returnLockerAddress: '12 Riverside', returnLockerLatitude: 10.77, returnLockerLongitude: 106.7 }
  await page.goto(`/customer/orders/${id}`)
  await expect(page.getByText('35%', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Estimated from historical processing data and store workload.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open Google Maps' })).toHaveAttribute('href', /10.77/)
  await page.getByRole('button', { name: 'Drop off at locker', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('The deposit deadline has passed.', { exact: false })).toBeVisible()
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('123456')
  await expect(dialog.getByRole('button', { name: 'I have placed my items and closed the door' })).toBeDisabled()
  expect(state.lockerCalls).toHaveLength(0)
})

test('pending complaint keeps evidence while editing, sends video messages, and can be withdrawn', async ({ page }) => {
  const state = await setup(page)
  const incidentId = '22222222-2222-4222-8222-000000000001'
  state.incidents = [{ id: incidentId, orderId: id, orderCode: initialOrder.orderCode, status: 1, canEdit: true, type: 1, severity: 1, description: 'Damaged shirt', imageUrls: ['/uploads/customer-test/rating.png'], videoUrls: [], createdOn: 1793923200, compensationAmount: 0, compensationStatus: 0 }]
  await page.goto(`/customer/complaints/${incidentId}`)
  await page.getByRole('button', { name: 'Edit complaint', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit complaint', exact: true })
  await dialog.getByLabel('Describe the issue', { exact: true }).fill('Updated damaged shirt description')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.incidents[0].imageUrls).toEqual(['/uploads/customer-test/rating.png'])
  const message = page.getByLabel('Message', { exact: true })
  await message.fill('Please check the video evidence')
  await page.locator('input[type="file"][accept*=".mp4"]').setInputFiles({ name: 'evidence.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video fixture') })
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
  await expect.poll(() => state.messages.length).toBe(1)
  await expect(page.getByText('Please check the video evidence', { exact: true })).toBeVisible()
  expect(state.messages[0].videoUrls).toEqual(['/uploads/customer-test/evidence.mp4'])
  expect(state.videoUploadCalls).toBe(1)
  await page.getByRole('button', { name: 'Withdraw complaint', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm withdrawal', exact: true }).click()
  await expect(page.getByText('Withdrawn', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit complaint', exact: true })).toHaveCount(0)
})

test('cancelled locker pickup preserves cancellation, and storage pickup requires explicit confirmation', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, status: 99, cancelledGoodsStatus: 1, cancelFeeAmount: 20000, cancelFeePaidAmount: 20000 }
  await page.goto(`/customer/orders/${id}`)
  await page.getByRole('button', { name: 'Collect from locker', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('654321')
  await dialog.getByRole('button', { name: 'Open pickup compartment', exact: true }).click()
  await dialog.getByRole('button', { name: 'Collected items and closed door', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.order.status).toBe(99)
  expect(state.order.cancelledGoodsStatus).toBe(4)
  state.order = { ...initialOrder, status: 13, paymentStatus: 2, storageLocation: 'Warehouse Q1', storageReference: 'STORE-01', overdueFeeTotal: 20000, storageFeeTotal: 20000 }
  await page.reload()
  await expect(page.getByText('Warehouse Q1', { exact: true })).toBeVisible()
  const before = state.lockerCalls.length
  await page.getByRole('button', { name: 'I have collected my items at storage' }).click()
  expect(state.lockerCalls).toHaveLength(before)
  dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'I have collected my items at storage' }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.order.status).toBe(12)
})

test('rating uploads and displays a video, and server receipt PDF downloads without locker secrets', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, status: 12, paymentStatus: 2 }
  await page.goto(`/customer/orders/${id}`)
  await page.getByRole('button', { name: 'Rate service', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('group', { name: 'Overall rating', exact: true }).getByRole('button', { name: 'Overall rating: 5/5 stars', exact: true }).click()
  await dialog.locator('input[type="file"][accept*=".mp4"]').setInputFiles({ name: 'review.webm', mimeType: 'video/webm', buffer: Buffer.from('video fixture') })
  await dialog.getByRole('button', { name: 'Submit rating', exact: true }).click()
  await expect.poll(() => state.ratingCalls.length).toBe(1)
  expect(state.ratingCalls[0].videoUrls).toEqual(['/uploads/customer-test/evidence.mp4'])
  await expect(dialog.locator('video')).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Payment printout', exact: true }).click()
  const receipt = page.getByRole('dialog', { name: 'Payment printout', exact: true })
  await expect(receipt.getByText('WG-RC-0001')).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await receipt.getByRole('button', { name: 'Download PDF' }).click()
  const file = await downloaded
  expect(file.suggestedFilename()).toBe(`washgo-receipt-${id}.pdf`)
  await expect(receipt).not.toContainText('123456')
  await expect(receipt).not.toContainText('654321')
})

test('cancellation fee uses its scoped endpoint and gateway return never claims laundry payment succeeded', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, status: 99, cancelledGoodsStatus: 1, cancelFeeAmount: 20000, cancelFeePaidAmount: 0, cancellationFeeOutstanding: 20000 }
  await page.route('https://gateway.example.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Mock fee gateway</h1>' }))
  await page.goto(`/customer/orders/${id}`)
  await expect(page.getByRole('button', { name: 'Collect from locker' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Pay cancellation fee', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Continue to payment' }).click()
  await expect(page).toHaveURL('https://gateway.example.test/fees')
  expect(state.feeCalls).toEqual([{ path: '/payment/cancellation-fee/create-url', body: { orderId: id, paymentMethod: 2 } }])
  await page.goto(`/payment/return?vnp_TxnRef=WG-CANCEL-${initialOrder.orderCode}-${'a'.repeat(32)}&vnp_ResponseCode=00`)
  await expect(page.getByRole('heading', { name: 'Check fee payment' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toHaveCount(0)
})

test('server complaint eligibility remains authoritative when the device clock is years ahead', async ({ page }) => {
  const state = await setup(page)
  state.order = completedForIncident()
  await page.addInitScript(() => {
    Date.now = () => 2051222400000
  })
  await page.goto(`/customer/orders/${id}`)
  await page.getByRole('button', { name: 'Report an issue', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Describe the issue', exact: true }).fill('Damaged shirt with a valid server deadline')
  await dialog.getByLabel('Add photos', { exact: true }).setInputFiles(incidentPhoto())
  await dialog.getByRole('button', { name: 'Submit report', exact: true }).click()
  await expect.poll(() => state.incidentCalls.length).toBe(1)
  await expect(page.getByRole('heading', { name: 'Complaint details', exact: true })).toBeVisible()
})

test('complaint row menu edits and withdraws pending reports and detail cards align', async ({ page }) => {
  const state = await setup(page)
  const incidentId = '22222222-2222-4222-8222-000000000001'
  state.incidents = [{ id: incidentId, orderId: id, orderCode: initialOrder.orderCode, status: 1, canEdit: true, type: 1, severity: 1, description: 'Damaged shirt', imageUrls: ['/uploads/customer-test/rating.png'], videoUrls: [], createdOn: 1793923200, compensationAmount: 0, compensationStatus: 0 }]
  await page.goto('/customer/complaints')
  await page.getByRole('button', { name: 'Complaint actions', exact: true }).click()
  await expect(page.getByRole('menuitem')).toHaveCount(3)
  await page.getByRole('menuitem', { name: 'Edit complaint', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Edit complaint', exact: true })
  await expect(edit.getByLabel('Describe the issue')).toHaveValue('Damaged shirt')
  await edit.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Complaint actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
  const compensation = page.getByRole('heading', { name: 'Compensation', exact: true }).locator('..')
  const resolution = page.getByRole('heading', { name: 'Resolution', exact: true }).locator('..')
  const main = page.getByRole('heading', { name: 'Damaged items', exact: true }).locator('../..')
  const a = await compensation.boundingBox(), b = await resolution.boundingBox(), c = await main.boundingBox()
  expect(b.y).toBeGreaterThanOrEqual(a.y + a.height)
  expect(b.x).toBe(a.x)
  expect(Math.abs(c.y - a.y)).toBeLessThan(2)
  await page.getByRole('button', { name: 'Back to complaints' }).click()
  await page.getByRole('button', { name: 'Complaint actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Withdraw complaint', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm withdrawal' }).click()
  await expect(page.getByText('Withdrawn', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Complaint actions', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Edit complaint', exact: true })).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: 'Withdraw complaint', exact: true })).toBeDisabled()
})

test('order cards load detail ETA in the background and refresh it without exposing locker credentials', async ({ page }) => {
  const state = await setup(page)
  state.order = { ...initialOrder, status: 4, predictionStatus: 'predicted', predictedFinishAt: '2026-11-08T10:00:00Z', predictionUpdatedAt: '2026-11-07T10:00:00Z' }
  let release
  const ready = new Promise((resolve) => {
    release = resolve
  })
  await page.route('**/api/wash-order/mine', (route) => route.fulfill({ json: { succeeded: true, list: [{ ...initialOrder, status: 4 }], currentPage: 1, total: 1, totalPages: 1 } }))
  await page.route(`**/api/wash-order/${id}`, async (route) => {
    await ready; await route.fulfill({ json: envelope(state.order) })
  })
  await page.goto('/customer/orders')
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: initialOrder.orderCode, exact: true }) })
  await expect(card).toBeVisible()
  await expect(card.getByText('Based on standard processing time')).toBeVisible()
  release()
  await expect(card.getByText('Estimated from processing history')).toBeVisible()
  await expect(card).toContainText('Nov 8, 2026')
  await expect(card).not.toContainText('123456')
  state.order = { ...state.order, predictedFinishAt: '2026-11-09T10:00:00Z' }
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(card).toContainText('Nov 9, 2026')
  await page.setViewportSize({ width: 375, height: 812 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
