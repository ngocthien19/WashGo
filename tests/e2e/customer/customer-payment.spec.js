import { test, expect } from '@playwright/test'
import { seedSeenTerms } from '../helpers/serviceTerms'

const user = { id: 'payment-customer', fullName: 'Payment Customer', email: 'payment@example.test', role: 'Customer' }
const orderId = '11111111-1111-4111-8111-111111111111'
const reference = `WG-PAY-WG2611059288-${'a'.repeat(16)}`
const order = { id: orderId, orderCode: 'WG2611059288', lockerName: 'Test locker', finalAmount: 80000, status: 8, paymentStatus: 1, paymentMethod: 2, includedWeightKg: 3, actualWeightKg: 3 }
const envelope = (data) => ({ succeeded: true, data })

async function setup(page, overrides = {}) {
  await seedSeenTerms(page, user.id)
  const state = { order: { ...order, ...overrides }, calls: [], failure: null, code: null, review: false, available: 50000, resultPatch: {}, verifications: [], verificationReads: [], verifyFailure: false, settleOnVerify: false, needsReview: false }
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
    if (path === `/payment/orders/${orderId}/active-session`) {
      return route.fulfill({ json: envelope({ orderId, purpose: 1, canVerify: !state.needsReview, requiresReconciliation: state.needsReview }) })
    }
    if (path === `/payment/orders/${orderId}/verify-session`) {
      const body = route.request().postDataJSON()
      state.verifications.push(body)
      if (state.verifyFailure) {
        return route.fulfill({ status: 503, json: { succeeded: false } })
      }
      return route.fulfill({ status: 202, json: envelope({ orderId, purpose: 1, operationId: body.operationId, state: 'Queued', retryAfterSeconds: 2 }) })
    }
    if (path.startsWith('/payment/verification-operations/')) {
      const operationId = path.split('/').at(-1)
      state.verificationReads.push(operationId)
      if (state.settleOnVerify) {
        state.order.paymentStatus = 2
      }
      return route.fulfill({ json: envelope({ orderId, purpose: 1, operationId, state: state.settleOnVerify ? 'Completed' : 'Verifying', retryAfterSeconds: 2, requiresReconciliation: false }) })
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
    if (path === '/customer/services/filter' || path === '/customer/lockers' || path === '/customer/service-categories') {
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

test('return success flags never override unpaid status and return survives sign-in', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/payment/return?vnp_TxnRef=${reference}&vnp_ResponseCode=00`)
  await expect(page).toHaveURL('/login')
  await english(page)
  await signIn(page)
  await expect(page).toHaveURL(new RegExp('/payment/return'))
  await expect(page.getByText(order.orderCode, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Check payment', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toHaveCount(0)
  expect(state.calls).toEqual([])
  state.order.paymentStatus = 2
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toBeVisible()
})

test('legacy return has no verification controls and reload reads the current payment status', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/payment/return?vnp_TxnRef=${reference}&vnp_ResponseCode=00`)
  await english(page)
  await signIn(page)
  await expect(page.getByText(order.orderCode, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Check payment', exact: true })).toHaveCount(0)
  await expect(page.getByText('The server has not confirmed payment yet.', { exact: false })).toHaveCount(0)
  expect(state.calls).toHaveLength(0)
  expect(state.verifications).toHaveLength(0)
  state.order.paymentStatus = 2
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Payment confirmed', exact: true })).toBeVisible()
})
