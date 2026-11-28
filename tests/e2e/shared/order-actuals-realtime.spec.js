import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'
import { mockStatusCounts } from '../helpers/merchantOrderData'

const id = '11111111-1111-4111-8111-111111111111'
const lineIds = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444']
async function setup(page, role) {
  await merchantSession(page, { role })
  const state = { connected: false, detailReads: 0, listReads: 0, summaryReads: 0, visible: true, denied: false, writes: [], event: 0,
    order: { id, orderCode: 'WG-ACTUALS', revision: 1, status: 3, paymentStatus: 1, totalAmount: 170000, finalAmount: 170000,
      discountAmount: 0, weightSurchargeAmount: 0, includedWeightKg: 5, baseProcessingHours: 12, createdOn: 1794009600,
      lockerName: 'Test locker', boxNumber: '1', timeline: [], items: [
        { id: lineIds[0], serviceName: 'Vest', quantity: 2, unitSnapshot: 'item', isWeightBased: false, unitPrice: 30000, subTotal: 60000 },
        { id: lineIds[1], serviceName: 'Shoes', quantity: 1, unitSnapshot: 'pair', isWeightBased: false, unitPrice: 50000, subTotal: 50000 },
        { id: lineIds[2], serviceName: 'Laundry package', quantity: 1, unitSnapshot: 'kg', isWeightBased: true, unitPrice: 60000, subTotal: 60000 }
      ] }
  }
  let socket
  await page.routeWebSocket('**/api/hubs/notifications*', ws => {
    socket = ws
    ws.onMessage(message => {
      if (String(message).includes('"protocol"')) {
        ws.send('{}\u001e'); state.connected = true
      }
    })
  })
  state.emit = (target = 'orderChanged', overrides = {}) => {
    const event = { eventId: `55555555-5555-4555-8555-${String(++state.event).padStart(12, '0')}`,
      occurredAt: '2026-11-26T01:00:00Z', ...(target === 'orderChanged' ? { orderId: id, revision: state.order.revision, changeType: 'StatusChanged' } : {}), ...overrides }
    socket.send(`${JSON.stringify({ type: 1, target, arguments: [event] })}\u001e`)
    return event
  }
  const actions = () => ({ allowedNextStatuses: state.order.actualsConfirmedAt ? [4] : [], statusOptions: [],
    canConfirmActuals: role === 'Merchant' && state.order.status === 3, canUpdateWeight: false })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    const paged = list => route.fulfill({ json: { succeeded: true, list, currentPage: 1, pageSize: 12, total: list.length, totalPages: list.length ? 1 : 0 } })
    if (path === '/hubs/notifications/negotiate') {
      return route.fulfill({ json: { negotiateVersion: 1, connectionId: 'mock-connection', connectionToken: 'mock-connection', availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }] } })
    }
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', role, fullName: 'Test user', email: 'test@example.test' })
    }
    if (path === '/merchant-profile') {
      return ok({ id: 'merchant-test', status: 1, businessName: 'Test shop' })
    }
    if (path === '/policy/customer') {
      return ok({ terms: { version: 'v1', content: 'Terms' }, rules: {}, accepted: true, requiresAcceptance: false })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === `/wash-order/${id}`) {
      state.detailReads++
      return state.denied ? route.fulfill({ status: 404, json: { succeeded: false, message: 'merchant.invalidResponse' } }) : ok({ ...state.order, allowedActions: actions() })
    }
    if (['/wash-order/mine', '/wash-order/filter'].includes(path)) {
      state.listReads++; return paged(state.visible ? [{ ...state.order, allowedActions: actions() }] : [])
    }
    if (path === '/wash-order/summary') {
      state.summaryReads++; return ok({ total: state.visible ? 1 : 0, statusCounts: mockStatusCounts(state.visible ? { [state.order.status]: 1 } : {}) })
    }
    if (path === `/wash-order/${id}/actuals/preview`) {
      const body = route.request().postDataJSON()
      expect(body.items).toHaveLength(2)
      expect(body.actualWeightKg).toBeGreaterThan(0)
      return ok({ revision: state.order.revision, status: 3, previousFinalAmount: state.order.finalAmount, totalAmount: 200000, weightSurchargeAmount: 10000,
        discountAmount: 0, finalAmount: 210000, promotionRemoved: true, promotionReasonCode: 'PromotionNoLongerEligible',
        items: body.items.map((line, index) => ({ ...line, quantity: state.order.items[index].quantity, unit: state.order.items[index].unitSnapshot, unitPrice: state.order.items[index].unitPrice, amount: line.actualQuantity * state.order.items[index].unitPrice })) })
    }
    if (path === `/wash-order/${id}/actuals`) {
      const body = route.request().postDataJSON(); state.writes.push(body)
      Object.assign(state.order, { revision: 2, totalAmount: 200000, finalAmount: 210000, actualWeightKg: body.actualWeightKg, actualsConfirmedAt: '2026-11-26T01:00:00Z', actualsNote: body.note })
      state.order.items = state.order.items.map(item => {
        const line = body.items.find(row => row.orderItemId === item.id)
        return line ? { ...item, actualQuantity: line.actualQuantity, actualSubTotal: line.actualQuantity * item.unitPrice } : item
      })
      return ok({ ...state.order, allowedActions: actions() })
    }
    if (path === `/payment/orders/${id}/summary`) {
      return ok({ orderId: id, orderCode: state.order.orderCode, currency: 'VND', outstanding: state.order.finalAmount, settled: false,
        obligations: [{ purpose: 1, due: state.order.finalAmount, paid: 0, outstanding: state.order.finalAmount }],
        quote: { orderId: id, purpose: 4, cashAmount: state.order.finalAmount, pointsToRedeem: 0, maximumPoints: 0, canCreate: true, quoteToken: 'quote', methods: [{ paymentMethod: 2, enabled: true }] } })
    }
    return paged([])
  })
  return state
}
const detailPath = role => `${role === 'Customer' ? '' : `/${role.toLowerCase()}`}/orders/${id}`
const listPath = role => `${role === 'Customer' ? '' : `/${role.toLowerCase()}`}/orders`

test('Customer keeps result count, range, refresh and pagination stable during focus revalidation', async ({ page }) => {
  const state = await setup(page, 'Customer')
  let blocked = false, total = 22, release
  const pending = new Promise(resolve => {
    release = resolve
  })
  await page.route('**/api/wash-order/mine', async route => {
    state.listReads++
    if (blocked) {
      await pending
    }
    const list = Array.from({ length: 6 }, (_, index) => ({ ...state.order, id: index ? `order-${index}` : id, orderCode: `WG-LIST-${index}` }))
    await route.fulfill({ json: { succeeded: true, list, currentPage: 1, pageSize: 6, total, totalPages: Math.ceil(total / 6) } })
  })
  await page.goto('/orders')
  const summary = page.getByRole('status').filter({ hasText: 'orders found' })
  const range = page.getByText('Showing 1–6 / 22', { exact: true })
  const refresh = page.getByRole('button', { name: 'Refresh', exact: true })
  const pagination = page.getByRole('navigation', { name: 'Pagination', exact: true })
  await expect(summary).toContainText('22')
  await expect(range).toBeVisible()
  await expect(refresh).toBeEnabled()
  await expect(pagination).toBeVisible()
  await expect.poll(() => state.connected && state.listReads >= 2).toBe(true)
  const before = state.listReads
  blocked = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect.poll(() => state.listReads).toBeGreaterThan(before)
  await expect(summary).toContainText('22')
  await expect(range).toBeVisible()
  await expect(refresh).toBeEnabled()
  await expect(pagination).toBeVisible()
  total = 23
  release()
  await expect(summary).toContainText('23')
  await expect(page.getByText('Showing 1–6 / 23', { exact: true })).toBeVisible()
})

test('Merchant confirms mixed actuals with a price preview on mobile and sees billed quantities', async ({ page }) => {
  const state = await setup(page, 'Merchant')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(detailPath('Merchant'))
  await expect.poll(() => state.detailReads).toBeGreaterThanOrEqual(2)
  await page.getByRole('button', { name: 'Confirm received items', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('spinbutton', { name: 'Actual (items)', exact: true }).fill('3')
  await dialog.getByRole('spinbutton', { name: 'Actual weight (kg)', exact: true }).fill('6')
  await dialog.getByRole('textbox').fill('Received one extra vest')
  await dialog.getByRole('button', { name: 'Preview price', exact: true }).click()
  await expect(dialog.getByText(/The voucher no longer qualifies/)).toBeVisible()
  await dialog.getByRole('checkbox').check()
  if (process.env.WASHGO_QA_SCREENSHOT) {
    for (const dark of [false, true]) {
      await page.evaluate(enabled => document.documentElement.classList.toggle('dark', enabled), dark)
      await page.screenshot({ path: `tests/ci/results/actuals-mobile-${dark ? 'dark' : 'light'}.png` })
    }
  }
  await expect(dialog.getByRole('button', { name: 'Confirm quantities and price', exact: true })).toBeInViewport()
  await dialog.getByRole('button', { name: 'Confirm quantities and price', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ expectedRevision: 1, expectedStatus: 3, expectedFinalAmount: 210000, actualWeightKg: 6, operationId: expect.any(String) })
  await expect(page.getByText('Received one extra vest')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const role of ['Customer', 'Merchant', 'Admin']) {
  test(`${role} refreshes an unseen list order and current detail on SignalR events`, async ({ page }) => {
    const state = await setup(page, role)
    state.visible = false
    await page.goto(listPath(role))
    await expect.poll(() => ({ connected: state.connected, refreshed: state.listReads >= 2 }), { timeout: 10000 }).toEqual({ connected: true, refreshed: true })
    const summaries = state.summaryReads
    state.visible = true; state.order.status = 4; state.order.revision = 2
    state.emit()
    await expect(page.getByText('WG-ACTUALS', { exact: true }).first()).toBeVisible()
    if (role !== 'Customer') {
      await expect.poll(() => state.summaryReads).toBeGreaterThan(summaries)
    }
    state.connected = false
    await page.goto(detailPath(role))
    await expect.poll(() => state.connected, { timeout: 10000 }).toBe(true)
    await expect(page.getByText('Washing', { exact: true }).first()).toBeVisible()
    const before = state.detailReads
    // A new child-record event at the same revision must still invalidate the order.
    state.order.status = 5
    state.emit('orderChanged', { changeType: 'PaymentChanged' })
    await expect.poll(() => state.detailReads).toBeGreaterThan(before)
    await expect(page.getByText('Drying', { exact: true }).first()).toBeVisible()
  })
}

test('Merchant keeps an open actuals draft but blocks confirmation after a live change and hides revoked detail', async ({ page }) => {
  const state = await setup(page, 'Merchant')
  await page.goto(detailPath('Merchant'))
  await expect.poll(() => state.detailReads).toBeGreaterThanOrEqual(2)
  await page.getByRole('button', { name: 'Confirm received items', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const count = dialog.getByRole('spinbutton', { name: 'Actual (items)', exact: true })
  await count.fill('4')
  state.order.status = 4; state.order.revision = 2; state.emit()
  await expect(dialog.getByRole('button', { name: 'Review updated order', exact: true })).toBeVisible()
  await expect(count).toHaveValue('4')
  await expect(count).toBeDisabled()
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  state.denied = true; state.emit('orderScopeChanged')
  await expect(page.getByRole('heading', { name: 'WG-ACTUALS', exact: true })).toHaveCount(0)
  await expect(page.getByRole('alert').first()).toBeVisible()
})
