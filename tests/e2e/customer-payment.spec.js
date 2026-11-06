import { test, expect } from '@playwright/test'
import { seedSeenTerms } from './helpers/serviceTerms'

const user = { id: 'payment-customer', fullName: 'Payment Customer', email: 'payment@example.test', role: 'Customer' }
const orderId = '11111111-1111-4111-8111-111111111111'
const reference = `WG-PAY-WG2611059288-${'a'.repeat(16)}`
const order = { id: orderId, orderCode: 'WG2611059288', lockerName: 'Test locker', finalAmount: 80000, status: 8, paymentStatus: 1, paymentMethod: 2, includedWeightKg: 3, actualWeightKg: 3 }
const envelope = (data) => ({ succeeded: true, data })

async function setup(page, overrides = {}) {
  await seedSeenTerms(page, user.id)
  const state = { order: { ...order, ...overrides }, calls: [], failure: null }
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
    if (path === '/auth/me') {
      return route.fulfill({ json: envelope(user) })
    }
    if (path === `/wash-order/${orderId}`) {
      return route.fulfill({ json: envelope(state.order) })
    }
    if (path === '/wash-order/mine') {
      expect(route.request().postDataJSON().keyword).toBe(order.orderCode)
      return route.fulfill({ json: { succeeded: true, list: [state.order], total: 1 } })
    }
    if (path === '/payment/create-url') {
      state.calls.push(route.request().postDataJSON())
      if (state.failure) {
        return route.fulfill({ status: state.failure, json: { succeeded: false, message: 'customer.payment.waitingWeight' } })
      }
      const method = state.calls.at(-1).paymentMethod
      return route.fulfill({ json: envelope({ orderId, paymentMethod: method, amount: 80000, transactionReference: reference, paymentUrl: `https://gateway.example.test/${method}` }) })
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

for (const [label, method] of [['VNPAY', 2], ['MoMo', 3]]) {
  test(`${label} checkout posts server identifiers and verifies payment on return`, async ({ page }) => {
    const state = await setup(page)
    await page.goto('/login')
    await english(page)
    await signIn(page)
    await expect(page).toHaveURL('/customer')
    await page.goto(`/customer/orders/${orderId}/payment`)
    await expect(page.getByRole('heading', { name: 'Order payment', exact: true })).toBeVisible()
    await page.getByRole('radio', { name: label, exact: true }).click()
    await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
    await expect(page).toHaveURL(`https://gateway.example.test/${method}`)
    expect(state.calls).toEqual([{ orderId, paymentMethod: method }])
    state.order.paymentStatus = 2
    await page.goto(`/payment/return?${method === 2 ? 'vnp_TxnRef' : 'orderId'}=${reference}&resultCode=0&vnp_ResponseCode=00`)
    await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue to payment', exact: true })).toHaveCount(0)
  })
}

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
  await page.getByRole('button', { name: 'Check status', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toBeVisible()
})

test('pending or unweighed orders cannot create payment requests', async ({ page }) => {
  const state = await setup(page, { status: 1, actualWeightKg: null })
  await page.goto('/login')
  await english(page)
  await signIn(page)
  await expect(page).toHaveURL('/customer')
  await page.goto(`/customer/orders/${orderId}/payment`)
  const pay = page.getByRole('button', { name: 'Continue to payment', exact: true })
  await expect(pay).toBeDisabled()
  state.order.status = 8
  await page.getByRole('button', { name: 'Check status', exact: true }).click()
  await expect(page.getByText('Waiting for the partner to weigh', { exact: false })).toBeVisible()
  await expect(pay).toBeDisabled()
  expect(state.calls).toEqual([])
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await expect(pay).toBeDisabled()
})

test('failed requests are not auto-retried; unknown outcomes remain locked after status refresh', async ({ page }) => {
  const state = await setup(page)
  state.failure = 400
  await page.goto('/login')
  await english(page)
  await signIn(page)
  await expect(page).toHaveURL('/customer')
  await page.goto(`/customer/orders/${orderId}/payment`)
  const pay = page.getByRole('button', { name: 'Continue to payment', exact: true })
  await pay.click()
  await expect(page.getByRole('alert')).toContainText('Waiting for the partner')
  expect(state.calls).toHaveLength(1)
  await expect(pay).toBeEnabled()
  state.failure = 500
  await pay.click()
  await expect(page.getByRole('alert')).toContainText('outcome is unknown')
  await expect(pay).toBeDisabled()
  await page.getByRole('button', { name: 'Check status', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('outcome is unknown')
  await expect(pay).toBeDisabled()
  expect(state.calls).toHaveLength(2)
})
