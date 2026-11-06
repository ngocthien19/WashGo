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
  if (!options.guest) {
    await page.addInitScript(() => localStorage.setItem('persist:root', JSON.stringify({
      auth: JSON.stringify({ user: { id: 'customer-test', fullName: 'Alex Nguyen', role: 'Customer' }, accessToken: 'test-access', refreshToken: 'test-refresh', expiresAt: '2099-01-01T00:00:00Z' }),
      preferences: JSON.stringify({ language: 'en' }), theme: JSON.stringify({ mode: 'light' }), _persist: JSON.stringify({ version: 1, rehydrated: true })
    })))
  }
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '')
    if (path === '/auth/me') {
      return route.fulfill({ json: envelope({ id: 'customer-test', fullName: 'Alex Nguyen', role: 'Customer' }) })
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
      if (path.endsWith('/confirm-pickup')) {
        expect(body).toEqual({ pickupSessionToken: 'mock-pickup-session-token' })
        state.order = { ...state.order, status: 12 }
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
      return route.fulfill({ json: envelope({ orderId: id, pickupSessionToken: 'mock-pickup-session-token', expiresAt: new Date(Date.now() + 600000).toISOString(), returnLockerName: initialOrder.lockerName, returnBoxNumber: '2' }) })
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

test('desktop keeps all navigation links while tablet and mobile use the menu', async ({ page }) => {
  await setup(page)
  await page.goto('/customer')
  const nav = page.locator('header nav').first()
  const menu = page.getByRole('button', { name: 'Open navigation menu', exact: true })
  for (const width of [1024, 1100, 1279, 1440, 1585]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('link')).toHaveCount(5)
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
  await page.getByRole('searchbox').fill('missing')
  await page.getByRole('search').getByRole('button', { name: 'Search orders', exact: true }).click()
  await expect(page.getByText('No matching orders. Try different filters.', { exact: true })).toBeVisible()
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
  await page.getByRole('button', { name: 'Collect from locker', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('000000')
  await dialog.getByRole('button', { name: 'Open pickup compartment', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('PIN or QR code is incorrect')
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('654321')
  await dialog.getByRole('button', { name: 'Open pickup compartment', exact: true }).click()
  await expect(dialog.getByText('Pickup session opened', { exact: true })).toBeVisible()
  expect(state.order.status).toBe(10)
  await dialog.getByRole('button', { name: 'Collected items and closed door', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Payment printout', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Payment receipt', exact: true })).toBeVisible()
  await expect(page.getByText('This is not an electronic or tax invoice.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Print receipt', exact: true }).click()
  expect(await page.evaluate(() => window.__printCalls)).toBe(1)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('header')).toBeHidden()
  await expect(page.locator('footer')).toBeHidden()
  await expect(page.getByRole('article', { name: 'Payment receipt', exact: true })).toBeVisible()
  const saved = await page.evaluate(() => localStorage.getItem('persist:root'))
  expect(saved).not.toContain('654321')
  expect(saved).not.toContain('mock-pickup-session-token')
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
