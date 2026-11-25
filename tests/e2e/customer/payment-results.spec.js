import { test, expect } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'
import { seedSeenTerms } from '../helpers/serviceTerms'

const orderId = '11111111-1111-4111-8111-111111111111', sessionId = '22222222-2222-4222-8222-222222222222'
const pages = { Succeeded: 'success', Failed: 'failed', Cancelled: 'cancelled', Pending: null, RequiresReview: null }
async function setup(page, { status = 'Pending', purpose = 1, paymentMethod = 2, superseded = false, guest = false } = {}) {
  if (!guest) {
    await merchantSession(page, { role: 'Customer' })
  } else {
    await page.addInitScript(() => {
      if (!localStorage.getItem('persist:root')) {
        localStorage.setItem('persist:root', JSON.stringify({ preferences: JSON.stringify({ language: 'en', serviceTermsSeen: { 'merchant-test': true } }), _persist: JSON.stringify({ version: 1, rehydrated: true }) }))
      }
    })
  }
  await seedSeenTerms(page, 'merchant-test')
  const state = { status, reads: [], writes: [], operations: [], verificationError: false, recover: false }
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/api/, '')
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: {} })
    }
    if (path === '/auth/login') {
      return ok({ user: { id: 'merchant-test', fullName: 'Customer Test', email: 'customer@example.test', role: 'Customer' }, accessToken: 'test-access', refreshToken: 'test-refresh', expiresAt: '2099-01-01T00:00:00Z' })
    }
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', fullName: 'Customer Test', email: 'customer@example.test', role: 'Customer' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === '/policy/customer') {
      return ok({ terms: { version: 'v1', content: 'Terms' }, accepted: true, requiresAcceptance: false })
    }
    if (path === `/wash-order/${orderId}`) {
      return ok({ id: orderId, orderCode: 'WG2611238696', status: 8, paymentStatus: 1, finalAmount: 80000, items: [], timeline: [], lockerName: 'Locker' })
    }
    if (path === `/payment/orders/${orderId}/result`) {
      state.reads.push(Object.fromEntries(url.searchParams))
      return ok({ orderId, orderCode: 'WG2611238696', purpose, sessionId, paymentMethod, status: state.status, resultPage: pages[state.status], verified: state.status === 'Succeeded', obligationSettled: state.status === 'Succeeded', amount: 80000, serverNow: '2026-11-24T10:00:00Z', supersededByNewerSession: superseded, capabilities: { canVerify: state.status === 'Pending', canRetry: ['Failed', 'Cancelled'].includes(state.status), canContinue: false, canViewOrder: true } })
    }
    if (path === `/payment/orders/${orderId}/verify-session`) {
      const body = request.postDataJSON(); state.writes.push(body)
      if (state.verificationError) {
        return route.fulfill({ status: 503, json: { succeeded: false } })
      }
      return ok({ operationId: body.operationId, orderId, purpose, state: 'Queued' })
    }
    if (path.startsWith('/payment/verification-operations/')) {
      const operationId = path.split('/').at(-1); state.operations.push(operationId)
      if (state.recover) {
        state.status = 'Succeeded'
      }
      return ok({ operationId, orderId, purpose, state: state.recover ? 'Completed' : 'Verifying' })
    }
    if (request.method() !== 'GET') {
      throw new Error(`Unexpected write ${path}`)
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return state
}
for (const paymentMethod of [2, 3]) {
  for (const [status, heading] of [['Succeeded', 'Payment successful'], ['Failed', 'Payment failed'], ['Cancelled', 'Payment cancelled'], ['RequiresReview', 'Payment needs review']]) {
    test(`gateway ${paymentMethod} shows authoritative ${status} for the exact fee attempt`, async ({ page }) => {
      const state = await setup(page, { status, purpose: 2, paymentMethod })
      await page.goto(`/payment/success?orderId=${orderId}&purpose=2&sessionId=${sessionId}`)
      if (pages[status]) {
        await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({ timeout: 15000 })
        await expect(page).toHaveURL(new RegExp(`/payment/${pages[status]}\\?`))
      } else {
        await expect(page).toHaveURL(`/orders/${orderId}`)
        await expect(page.getByRole('heading', { name: heading, exact: true })).toHaveCount(0)
      }
      expect(state.reads[0]).toEqual({ purpose: '2', sessionId })
      expect(state.writes).toEqual([])
    })
  }
}
for (const superseded of [false, true]) {
  test(`unresolved return has no confirmation or verification UI (older=${superseded})`, async ({ page }) => {
    const state = await setup(page, { purpose: 3, superseded })
    await page.goto(`/payment/success?orderId=${orderId}&purpose=3&sessionId=${sessionId}`)
    await expect(page).toHaveURL(`/payment/success?orderId=${orderId}&purpose=3&sessionId=${sessionId}`)
    await expect(page.getByRole('heading', { name: 'Confirming payment', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Check payment', exact: true })).toHaveCount(0)
    await expect.poll(() => state.reads.length, { timeout: 15000 }).toBeGreaterThanOrEqual(1)
    expect(state.writes).toEqual([])
    expect(state.operations).toEqual([])
  })
}

for (const source of ['/payment/failed', `/orders/${orderId}`]) {
  for (const [status, heading] of [['Succeeded', 'Payment successful'], ['Failed', 'Payment failed'], ['Cancelled', 'Payment cancelled']]) {
    test(`delayed gateway outcome from ${source} opens ${status} without verification UI`, async ({ page }) => {
      const state = await setup(page, { purpose: 3 })
      await page.goto(`${source}?orderId=${orderId}&purpose=3&sessionId=${sessionId}`)
      await expect.poll(() => state.reads.length, { timeout: 15000 }).toBeGreaterThan(0)
      await expect(page.getByRole('heading', { name: 'Confirming payment', exact: true })).toHaveCount(0)
      await expect(page).toHaveURL(`${source}?orderId=${orderId}&purpose=3&sessionId=${sessionId}`)
      await expect(page.getByRole('heading', { name: 'Payment failed', exact: true })).toHaveCount(0)
      state.status = status
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible({ timeout: 15000 })
      await expect(page).toHaveURL(new RegExp(`/payment/${pages[status]}\\?`))
      expect(state.reads.every(row => row.purpose === '3' && row.sessionId === sessionId)).toBe(true)
      expect(state.writes).toEqual([])
      expect(state.operations).toEqual([])
    })
  }
}

test('a return without safe identifiers opens orders without claiming success', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/payment/success?resultCode=0&vnp_ResponseCode=00')
  await expect(page).toHaveURL('/orders')
  await expect(page.getByRole('heading', { name: 'Confirming payment', exact: true })).toHaveCount(0)
  expect(state.reads).toEqual([])
  expect(state.writes).toEqual([])
})

test('login resumes the same payment attempt and discards gateway query fields', async ({ page }) => {
  const state = await setup(page, { guest: true, status: 'Succeeded' })
  await page.goto(`/payment/success?orderId=${orderId}&purpose=1&sessionId=${sessionId}&vnp_SecureHash=discard`)
  await expect(page).toHaveURL('/login')
  await page.getByLabel('Email', { exact: true }).fill('customer@example.test')
  await page.getByLabel('Password', { exact: true }).fill('Password123')
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Payment successful', exact: true })).toBeVisible()
  await expect(page).toHaveURL(`/payment/success?orderId=${orderId}&purpose=1&sessionId=${sessionId}`)
  expect(state.reads[0]).toEqual({ purpose: '1', sessionId })
  expect(state.writes).toEqual([])
})
