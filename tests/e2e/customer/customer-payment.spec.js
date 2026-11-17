import { test, expect } from '@playwright/test'
import { seedSeenTerms } from '../helpers/serviceTerms'

const user = { id: 'payment-customer', fullName: 'Payment Customer', email: 'payment@example.test', role: 'Customer' }
const orderId = '11111111-1111-4111-8111-111111111111'
const reference = `WG-PAY-WG2611059288-${'a'.repeat(16)}`
const order = { id: orderId, orderCode: 'WG2611059288', lockerName: 'Test locker', finalAmount: 80000, status: 8, paymentStatus: 1, paymentMethod: 2, includedWeightKg: 3, actualWeightKg: 3 }
const envelope = (data) => ({ succeeded: true, data })

async function setup(page, overrides = {}) {
  await seedSeenTerms(page, user.id)
  const state = { order: { ...order, ...overrides }, calls: [], failure: null, code: null, review: false, available: 50000, resultPatch: {} }
  await page.route('https://accounts.google.com/**', (route) => route.abort())
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: { succeeded: false } })
    }
    if (path === '/notification/unread-count') {
      return route.fulfill({ json: envelope(0) })
    }
    if (path === '/auth/login') {
      return route.fulfill({ json: envelope({ user, accessToken: 'test-access', refreshToken: 'test-refresh', expiresAt: '2099-01-01T00:00:00Z' }) })
    }
    if (path === '/policy/customer') {
      return route.fulfill({ json: envelope({ terms: { version: 'v1', content: 'Terms' }, rules: {}, accepted: true, requiresAcceptance: false }) })
    }
    if (path === '/auth/me') {
      return route.fulfill({ json: envelope(user) })
    }
    if (path === `/wash-order/${orderId}`) {
      return route.fulfill({ json: envelope(state.order) })
    }
    if (path === `/customer/loyalty/quote/${orderId}`) {
      const points = Number(new URL(route.request().url()).searchParams.get('pointsToRedeem'))
      const amount = state.order.finalAmount
      return route.fulfill({ json: envelope({ orderId, laundryAmount: amount, availablePoints: state.available, maximumPoints: Math.min(Math.floor(amount * .2), state.available), pointsToRedeem: points, cashAmount: amount - points, expectedEarnedPoints: Math.floor((amount - points) / 100), isEstimate: true }) })
    }
    if (path === '/wash-order/mine') {
      expect(route.request().postDataJSON().keyword).toBe(order.orderCode)
      return route.fulfill({ json: { succeeded: true, list: [state.order], total: 1 } })
    }
    if (path === '/payment/create-url') {
      state.calls.push(route.request().postDataJSON())
      if (state.code) {
        return route.fulfill({ status: 409, json: { succeeded: false, meta: { code: state.code, retryAfterSeconds: 2 } } })
      }
      if (state.failure) {
        return route.fulfill({ status: state.failure, json: { succeeded: false, message: 'customer.payment.waitingWeight' } })
      }
      const method = state.calls.at(-1).paymentMethod
      const points = state.calls.at(-1).pointsToRedeem
      return route.fulfill({ json: envelope({ orderId, paymentMethod: method, amount: state.order.finalAmount - points, pointsToRedeem: points, purpose: 1, transactionStatus: state.review ? 5 : 1, sessionState: 2, requiresReconciliation: state.review, transactionReference: reference, paymentUrl: `https://gateway.example.test/${method}`, ...state.resultPatch }) })
    }
    if (path === '/customer/services/filter' || path === '/customer/lockers') {
      return route.fulfill({ json: { succeeded: true, list: [], total: 0, currentPage: 1, totalPages: 0 } })
    }
    throw new Error(`Unexpected API call: ${path}`)
  })
  await page.route('https://gateway.example.test/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Mock payment gateway</h1>' }))
  return state
}

async function signIn(page) {
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('Password123')
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
}

async function english(page) {
  await page.getByRole('button', { name: 'Đổi ngôn ngữ', exact: true }).click()
  await page.getByRole('menuitem', { name: 'English', exact: true }).click()
}

test('amount policy uses cash after applied points and blocks VNPay before creating a session', async ({ page }) => {
  const state = await setup(page, { finalAmount: 12000 })
  await page.goto('/login')
  await english(page)
  await signIn(page)
  await expect(page).toHaveURL('/')
  await page.goto(`/orders/${orderId}/payment`)
  const pay = page.getByRole('button', { name: 'Continue to payment', exact: true })
  await expect(pay).toBeEnabled()
  const checkout = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Order payment', exact: true }) })
  await expect(page.getByRole('button', { name: 'Check status', exact: true })).toHaveCount(0)
  await expect(checkout.getByText('Test locker', { exact: true })).toHaveCSS('font-size', '20px')
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 })
    const orders = page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last()
    await orders.scrollIntoViewIfNeeded()
    const left = await orders.boundingBox()
    const right = await pay.boundingBox()
    expect(left.y).toBe(right.y)
    expect(left.x).toBeLessThan(right.x)
    expect(left.height).toBe(48)
    expect(right.height).toBe(48)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 375, height: 600 })
  const dialog = page.getByRole('dialog', { name: 'Order payment', exact: true })
  const header = dialog.locator('header')
  const footer = dialog.locator('footer')
  const content = dialog.locator('section').first().locator(':scope > div')
  await expect(footer).toHaveCSS('border-top-width', '1px')
  const headerBefore = await header.boundingBox()
  const footerBefore = await footer.boundingBox()
  await content.evaluate(element => {
    element.scrollTop = element.scrollHeight
  })
  await expect.poll(() => content.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect((await header.boundingBox()).y).toBe(headerBefore.y)
  expect((await footer.boundingBox()).y).toBe(footerBefore.y)
  await expect(footer.getByRole('button', { name: 'Close', exact: true })).toBeVisible()
  await expect(footer.getByRole('button', { name: 'Continue to payment', exact: true })).toBeVisible()
  await page.getByRole('switch', { name: 'Use reward points', exact: true }).check()
  await expect(page.getByRole('radio', { name: 'VNPAY', exact: true })).toBeDisabled()
  await expect(pay).toBeDisabled()
  expect(state.calls).toHaveLength(0)
  await page.getByRole('radio', { name: 'MoMo', exact: true }).click()
  await expect(page.getByText(/Recommended: use MoMo wallet/)).toBeVisible()
  await pay.click()
  await expect(page).toHaveURL('https://gateway.example.test/3')
  expect(state.calls).toEqual([{ orderId, paymentMethod: 3, pointsToRedeem: 2400 }])
})

test('points require an applied server quote and initializing retries preserve method and exact points', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/login')
  await english(page)
  await signIn(page)
  await expect(page).toHaveURL('/')
  await page.goto(`/orders/${orderId}/payment`)
  const points = page.getByRole('switch', { name: 'Use reward points', exact: true })
  const pay = page.getByRole('button', { name: 'Continue to payment', exact: true })
  await points.check()
  await expect(page.getByText('640', { exact: true })).toBeVisible()
  state.code = 'PaymentInitializing'
  await pay.click()
  await expect(page.getByRole('alert')).toContainText('being created')
  await expect(points).toBeDisabled()
  await expect(page.getByRole('radio', { name: 'MoMo', exact: true })).toBeDisabled()
  const retry = page.getByRole('button', { name: 'Retry the same session', exact: true })
  await expect(retry).toBeEnabled()
  state.code = null
  await retry.click()
  await expect(page).toHaveURL('https://gateway.example.test/2')
  expect(state.calls).toEqual(Array(2).fill({ orderId, paymentMethod: 2, pointsToRedeem: 16000 }))
})

test('insufficient points refresh the quote; a review response with a URL never redirects or claims payment', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/login')
  await english(page)
  await signIn(page)
  await expect(page).toHaveURL('/')
  await page.goto(`/orders/${orderId}/payment`)
  const points = page.getByRole('switch', { name: 'Use reward points', exact: true })
  await points.check()
  const pay = page.getByRole('button', { name: 'Continue to payment', exact: true })
  await expect(pay).toBeEnabled()
  state.available = 0
  state.code = 'InsufficientPoints'
  await pay.click()
  await expect(points).not.toBeChecked()
  await expect(page.getByText('0 points available', { exact: false })).toBeVisible()
  state.code = null
  state.review = true
  await pay.click()
  await expect(page.getByRole('alert')).toContainText('needs verification')
  await expect(pay).toBeDisabled()
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}/payment`))
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Check status', exact: true })).toHaveCount(0)
  await expect(pay).toBeDisabled()
  expect(state.calls).toHaveLength(2)
})

for (const [label, method] of [['VNPAY', 2], ['MoMo', 3]]) {
  test(`${label} checkout posts server identifiers and verifies payment on return`, async ({ page }) => {
    const state = await setup(page)
    await page.goto('/login')
    await english(page)
    await signIn(page)
    await expect(page).toHaveURL('/')
    await page.goto(`/orders/${orderId}/payment`)
    await expect(page.getByRole('heading', { name: 'Order payment', exact: true })).toBeVisible()
    await page.getByRole('radio', { name: label, exact: true }).click()
    await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
    await expect(page).toHaveURL(`https://gateway.example.test/${method}`)
    expect(state.calls).toEqual([{ orderId, paymentMethod: method, pointsToRedeem: 0 }])
    state.order.paymentStatus = 2
    await page.goto(`/payment/return?${method === 2 ? 'vnp_TxnRef' : 'orderId'}=${reference}&resultCode=0&vnp_ResponseCode=00`)
    await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue to payment', exact: true })).toHaveCount(0)
  })
}

test('a session with mismatched cash remains locked instead of redirecting to an unreviewed amount', async ({ page }) => {
  const state = await setup(page)
  state.resultPatch = { amount: 90000 }
  await page.goto('/login')
  await english(page)
  await signIn(page)
  await expect(page).toHaveURL('/')
  await page.goto(`/orders/${orderId}/payment`)
  const pay = page.getByRole('button', { name: 'Continue to payment', exact: true })
  await pay.click()
  await expect(page.getByRole('alert')).toContainText('outcome is unknown')
  await expect(pay).toBeDisabled()
  await expect(page).toHaveURL(new RegExp(`/orders/${orderId}/payment`))
  expect(state.calls).toHaveLength(1)
})

test('return success flags never override unpaid status and return survives sign-in', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/payment/return?vnp_TxnRef=${reference}&vnp_ResponseCode=00`)
  await expect(page).toHaveURL('/login')
  await english(page)
  await signIn(page)
  await expect(page).toHaveURL(new RegExp('/payment/return'))
  await expect(page.getByText('The server has not confirmed payment yet.', { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toHaveCount(0)
  expect(state.calls).toEqual([])
  state.order.paymentStatus = 2
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toBeVisible()
})

test('pending or unweighed orders cannot create payment requests', async ({ page }) => {
  const state = await setup(page, { status: 1, actualWeightKg: null })
  await page.goto('/login')
  await english(page)
  await signIn(page)
  await expect(page).toHaveURL('/')
  await page.goto(`/orders/${orderId}/payment`)
  const pay = page.getByRole('button', { name: 'Continue to payment', exact: true })
  await expect(pay).toBeDisabled()
  state.order.status = 8
  await page.reload()
  await expect(page.getByText('Waiting for the partner to weigh', { exact: false })).toBeVisible()
  await expect(pay).toBeDisabled()
  expect(state.calls).toEqual([])
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.goto('/services')
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.goto(`/orders/${orderId}/payment`)
  await expect(pay).toBeDisabled()
})

test('failed requests are not auto-retried and unknown outcomes remain locked without manual status checks', async ({ page }) => {
  const state = await setup(page)
  state.failure = 400
  await page.goto('/login')
  await english(page)
  await signIn(page)
  await expect(page).toHaveURL('/')
  await page.goto(`/orders/${orderId}/payment`)
  const pay = page.getByRole('button', { name: 'Continue to payment', exact: true })
  await pay.click()
  await expect(page.getByRole('alert')).toContainText('Waiting for the partner')
  expect(state.calls).toHaveLength(1)
  await expect(pay).toBeEnabled()
  state.failure = 500
  await pay.click()
  await expect(page.getByRole('alert')).toContainText('outcome is unknown')
  await expect(pay).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Check status', exact: true })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText('outcome is unknown')
  await expect(pay).toBeDisabled()
  expect(state.calls).toHaveLength(2)
})
