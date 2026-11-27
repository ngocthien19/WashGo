import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'
import { seedSeenTerms } from '../helpers/serviceTerms'
import { expectDialogCheckboxLabels } from '../helpers/dialogCheckboxes'
const orderId = '11111111-1111-4111-8111-111111111111'
const sessionId = '22222222-2222-4222-8222-222222222222'
const order = { id: orderId, orderCode: 'WG2611238696', status: 13, paymentStatus: 1, finalAmount: 130000, lockerId: '33333333-3333-4333-8333-333333333333', revision: 1 }
async function setup(page, { cancelled = false, paidService = false, zero = false, active = null } = {}) {
  await merchantSession(page, { role: 'Customer' }); await seedSeenTerms(page, 'merchant-test')
  const state = { writes: [], reads: [], fail: null, changed: false, active, settled: false, maximumPoints: 10000 }
  const makeSummary = (points = 0) => {
    const service = cancelled || paidService ? 0 : 130000
    const due = zero ? 0 : state.changed ? 240000 : cancelled ? 40000 : service + 100000
    return { orderId, orderCode: order.orderCode, orderStatus: cancelled ? 99 : 13, currency: 'VND', outstanding: due, settled: state.settled, canRequestStorageReturn: state.settled, returnLockerId: order.lockerId,
      obligations: zero ? [] : cancelled ? [{ purpose: 3, due, paid: 0, outstanding: due }] : [{ purpose: 1, due: 130000, paid: paidService ? 130000 : 0, outstanding: service }, { purpose: 2, due: due - service, paid: 0, outstanding: due - service }],
      cancellationBasis: cancelled ? 200000 : null, cancellationRatePercent: cancelled ? 20 : null, cancellationOffset: 0,
      refunds: { pendingAmount: cancelled ? 10000 : 0, refundedAmount: 0, pendingPoints: 0, refundedPoints: 0 },
      quote: { orderId, purpose: 4, computedAt: '2026-11-25T01:00:00Z', pointsToRedeem: points, maximumPoints: service ? state.maximumPoints : 0, availablePoints: state.maximumPoints, canCreate: !state.active && due > 0, quoteToken: state.changed ? 'new-token' : 'original-token', cashAmount: due - points, activeSession: state.active, methods: [2, 3].map(paymentMethod => ({ paymentMethod, enabled: !state.active })) } }
  }
  await page.route('https://gateway.example.test/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Gateway</h1>' }))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname.replace(/^\/api/, '')
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', role: 'Customer', fullName: 'Customer Test' })
    }
    if (path === '/policy/customer') {
      return ok({ terms: { version: 'v1', content: 'Terms' }, accepted: true, requiresAcceptance: false })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === `/wash-order/${orderId}`) {
      return ok({ ...order, status: cancelled ? 99 : 13 })
    }
    if (path.endsWith('/summary')) {
      const points = Number(url.searchParams.get('pointsToRedeem')); state.reads.push(points); return ok(makeSummary(points))
    }
    if (route.request().method() === 'POST' && (path.endsWith('/checkout') || path === '/payment/create-url' || path.endsWith('-fee/create-url'))) {
      const body = route.request().postDataJSON(); state.writes.push({ path, body })
      if (state.fail === 'QuoteChanged') {
        state.changed = true; state.fail = null; return route.fulfill({ status: 409, json: { succeeded: false, meta: { code: 'QuoteChanged' }, data: { summary: makeSummary(body.pointsToRedeem) } } })
      }
      if (state.fail === 'InsufficientPoints') {
        state.fail = null
        return route.fulfill({ status: 409, json: { succeeded: false, meta: { code: 'InsufficientPoints' } } })
      }
      if (state.fail) {
        return route.fulfill({ status: 503, json: { succeeded: false } })
      }
      const purpose = state.active?.purpose || 4
      return ok({ orderId, purpose, paymentMethod: body.paymentMethod, pointsToRedeem: body.pointsToRedeem || 0, amount: state.active?.amount || makeSummary(body.pointsToRedeem).quote.cashAmount, sessionState: 2, transactionStatus: 1, paymentUrl: 'https://gateway.example.test/pay' })
    }
    if (path.endsWith('/result')) {
      return ok({ orderId, purpose: 4, sessionId, orderCode: order.orderCode, status: 'Succeeded', resultPage: 'success', verified: true, obligationSettled: false, amount: 230000, allocations: [{ purpose: 1, cashAmount: 130000, points: 0 }, { purpose: 2, cashAmount: 100000, points: 0 }], summary: makeSummary(), capabilities: { canVerify: false, canContinue: false, canRetry: false, canViewOrder: true } })
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return state
}
async function openCheckout(page) {
  await page.goto(`/orders/${orderId}/payment`)
  const dialog = page.getByRole('dialog', { name: 'Order payment', exact: true })
  await expect(dialog).toBeVisible({ timeout: 15000 })
  await expect(dialog.getByText('Total outstanding', { exact: true })).toBeVisible({ timeout: 15000 })
}
for (const method of [2, 3]) {
  test(`combined service and storage checkout uses one server quote via gateway ${method}`, async ({ page }) => {
    const state = await setup(page)
    await openCheckout(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Pay all outstanding order charges in one payment.', { exact: true })).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Check payment', exact: true })).toHaveCount(0)
    await expect(dialog.getByText('230,000', { exact: false }).first()).toBeVisible()
    await dialog.getByRole('radio', { name: method === 2 ? 'VNPay' : 'MoMo', exact: true }).check()
    await dialog.getByRole('button', { name: /^Pay / }).click()
    await expect(page).toHaveURL('https://gateway.example.test/pay')
    expect(state.writes).toEqual([{ path: `/payment/orders/${orderId}/checkout`, body: { paymentMethod: method, pointsToRedeem: 0, expectedQuoteToken: 'original-token' } }])
  })
}
test('quote changes require a second explicit confirmation with the new token', async ({ page }) => {
  const state = await setup(page); state.fail = 'QuoteChanged'
  await openCheckout(page)
  await page.getByRole('button', { name: /^Pay / }).click()
  await expect(page.getByRole('alert')).toContainText('charges have changed')
  expect(state.writes).toHaveLength(1)
  await page.getByRole('button', { name: /^Confirm updated payment/ }).click()
  await expect(page).toHaveURL('https://gateway.example.test/pay')
  expect(state.writes[1].body.expectedQuoteToken).toBe('new-token')
})

test('paid services are not charged again and points require a new server summary', async ({ page }) => {
  const state = await setup(page, { paidService: true })
  await openCheckout(page)
  await expect(page.getByRole('button', { name: /^Pay now/ })).toContainText('100,000')
  await expect(page.getByRole('checkbox', { name: /Use reward points/ })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
})

test('reward points refresh the summary before submitting the combined quote', async ({ page }) => {
  const state = await setup(page)
  await openCheckout(page)
  await expectDialogCheckboxLabels(page.getByRole('dialog'))
  await page.getByRole('checkbox', { name: /Use reward points/ }).check()
  const pay = page.getByRole('button', { name: /^Pay now/ })
  await expect(pay).toContainText('220,000')
  await pay.click()
  await expect(page).toHaveURL('https://gateway.example.test/pay')
  expect(state.reads).toContain(10000)
  expect(state.writes[0].body.pointsToRedeem).toBe(10000)
})

test('combined checkout keeps one scrolling body on a narrow mobile screen', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 375, height: 640 })
  await openCheckout(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: /^Pay now/ })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const body = dialog.locator('section > div').first()
  const header = await dialog.locator('header').boundingBox(), footer = await dialog.locator('footer').boundingBox()
  await body.evaluate(element => {
    element.scrollTop = element.scrollHeight
  })
  await expect.poll(() => body.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect((await dialog.locator('header').boundingBox()).y).toBe(header.y)
  expect((await dialog.locator('footer').boundingBox()).y).toBe(footer.y)
})

test('insufficient points refreshes the quote without replaying the payment', async ({ page }) => {
  const state = await setup(page)
  await openCheckout(page)
  await page.getByRole('checkbox', { name: /Use reward points/ }).check()
  const pay = page.getByRole('button', { name: /^Pay now/ })
  await expect(pay).toContainText('220,000')
  state.maximumPoints = 0; state.fail = 'InsufficientPoints'
  await pay.click()
  await expect(page.getByRole('checkbox', { name: /Use reward points/ })).not.toBeChecked()
  await expect(pay).toContainText('230,000')
  await expect(pay).toBeEnabled()
  expect(state.writes).toHaveLength(1)
  await pay.click()
  await expect(page).toHaveURL('https://gateway.example.test/pay')
  expect(state.writes[1].body.pointsToRedeem).toBe(0)
})
test('cancelled orders charge only percentage fee and distinguish a pending refund', async ({ page }) => {
  await setup(page, { cancelled: true })
  await openCheckout(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Cancellation fee', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Service amount', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText(/Refund pending/)).toBeVisible()
  await expect(dialog.getByText(/Cancellation fee basis/)).toContainText('20%')
})
test('zero without settled is not presented as paid and never creates a gateway request', async ({ page }) => {
  const state = await setup(page, { zero: true })
  await openCheckout(page)
  await expect(page.getByText('No charges are currently payable.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Pay / })).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})
test('uncertain combined checkout is locked and does not automatically retry', async ({ page }) => {
  const state = await setup(page); state.fail = 'timeout'
  await openCheckout(page)
  await page.getByRole('button', { name: /^Pay / }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Pay / })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
})
test('legacy fee session is resumed with its actual purpose and gateway', async ({ page }) => {
  const state = await setup(page, { active: { orderId, purpose: 2, paymentMethod: 3, pointsToRedeem: 0, amount: 100000, sessionId, canContinue: true } })
  await openCheckout(page)
  await page.getByRole('button', { name: /^Continue payment/ }).click()
  await expect(page).toHaveURL('https://gateway.example.test/pay')
  expect(state.writes[0]).toEqual({ path: '/payment/overdue-fee/create-url', body: { orderId, paymentMethod: 3 } })
})
test('verified combined receipt remains successful when new charges remain outstanding', async ({ page }) => {
  await setup(page)
  await page.goto(`/payment/success?orderId=${orderId}&purpose=4&sessionId=${sessionId}`)
  await expect(page.getByRole('heading', { name: 'Payment successful', exact: true })).toBeVisible()
  await expect(page.getByText('Total outstanding', { exact: true })).toBeVisible()
})
