import { taskDto, securityRoutes } from '../helpers/shipperContracts'
import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'
const photo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#c7d2fe"/></svg>')}`

for (const hasLegacyRating of [true, false]) {
  test(`profile omits shipper stars with ${hasLegacyRating ? 'legacy' : 'absent'} rating data`, async ({ page }) => {
    const state = await setup(page)
    if (!hasLegacyRating) {
      delete state.profile.rating
    }
    await page.goto('/shipper/profile')
    await expect(page.getByRole('heading', { name: 'Alex Driver', exact: true })).toBeVisible()
    await expect(page.getByText('Lifetime deliveries', { exact: true })).toBeVisible()
    await expect(page.getByText('Rating', { exact: true })).toHaveCount(0)
    await expect(page.getByText('4.8 / 5', { exact: true })).toHaveCount(0)
    expect(state.writes).toHaveLength(0)
  })
}

async function setup(page, options = {}) {
  await merchantSession(page, { role: 'Shipper', dark: options.dark })
  const state = { writes: [], historyFilters: [], failTasks: false, profile: { revision: 'profile-v1', id: 'shipper-test', fullName: 'Alex Driver', email: 'driver@example.test', phone: '0901234567', avatarUrl: null, vehicleType: 1, vehiclePlate: '59-X1 12345', status: 1, isActive: true, totalDeliveries: 24, rating: 4.8, merchantId: 'store-1', merchantName: 'WashGo Test Store' } }
  await page.route('**/api/**', async (route) => {
    if (await securityRoutes(route)) {
      return
    }
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '')
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    if (path === '/auth/me') {
      return ok({ id: 'user-test', fullName: 'Alex Driver', email: 'driver@example.test', role: 'Shipper' })
    }
    if (path === '/shipper-profile') {
      if (options.missingProfile) {
        return route.fulfill({ status: 404, json: { succeeded: false, message: 'Không tìm thấy hồ sơ Shipper.' } })
      }
      if (request.method() === 'PUT') {
        const body = request.postDataJSON()
        state.writes.push(body)
        if (options.unknown) {
          return route.fulfill({ status: 503, json: { succeeded: false } })
        }
        state.profile = { ...state.profile, ...body, avatarUrl: body.avatarUrl === null ? state.profile.avatarUrl : body.avatarUrl }
      }
      return ok(state.profile)
    }
    if (path === '/shipper-dashboard') {
      const query = Object.fromEntries(new URL(request.url()).searchParams); state.historyFilters.push(query)
      if (state.failTasks) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      const performance = { total: 2, onTimeCount: 0, slaSampleCount: 0, onTimeRate: null, durationSampleCount: 0, averageDurationHours: null }
      return ok({ pendingCollectCount: 7, pendingReturnCount: 0, completedCollectCount: 0, completedReturnCount: 2, totalDeliveries: 24, generatedAt: '2026-11-12T01:00:00Z', from: '2026-11-11T17:00:00Z', to: '2026-11-12T01:00:00Z', previousFrom: '2026-11-10T17:00:00Z', previousTo: '2026-11-11T01:00:00Z', chart: [], performance, previousPerformance: performance, pendingCollect: [taskDto({ id: 'order-1', orderCode: 'WG-TEST-1', assignedTaskType: 1, nextAction: 1, status: 2, revision: 1, lockerName: 'Ben Thanh Locker', lockerImageUrls: [photo], lockerAddress: 'Dashboard locker address', boxNumber: '3', shipperAssignedAt: '2026-11-09T01:00:00Z', shipperNote: 'Collect sealed bag' })], pendingReturn: [], recentCompletions: [{ eventId: 'event-1', orderId: 'past-order', orderCode: 'WG-DONE-1', taskType: 2, lockerName: 'Ben Thanh Locker', lockerImageUrls: [photo], lockerAddress: 'Dashboard locker address', completedAt: '2026-11-09T02:00:00Z' }] })
    }
    if (path.startsWith('/shipper-profile/operations/')) {
      return ok(state.profile)
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: {} })
    }
    throw new Error(`Unexpected request: ${request.method()} ${path}`)
  })
  return state
}

test('dashboard uses scoped totals and shared layout; profile stays in the account menu', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/shipper')
  await expect(page.getByRole('heading', { name: 'Delivery overview', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toHaveCSS('font-size', '16px')
  await expect(page.getByRole('heading', { name: 'Pending collections', exact: true }).first().locator('..')).toContainText('7')
  await expect(page.getByText('Showing 1 / 7 pending tasks.', { exact: true })).toBeVisible()
  await expect(page.getByText('Collect sealed bag', { exact: true })).toBeVisible()
  await expect(page.getByAltText('Ben Thanh Locker')).toHaveCount(2)
  await expect(page.getByText('Dashboard locker address', { exact: true })).toHaveCount(2)
  await expect(page.locator('aside').getByRole('link', { name: 'My profile', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'My profile', exact: true }).click()
  await expect(page).toHaveURL('/shipper/profile')
  await expect(page.getByText('59-X1 12345', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Close service details', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('missing delivery profile still shows authenticated personal details, with retry and no invented work information', async ({ page }) => {
  const options = { missingProfile: true }
  await setup(page, options)
  await page.goto('/shipper/profile')
  await expect(page.getByRole('alert')).toContainText('could not find a Shipper profile')
  await expect(page.locator('main').getByText('driver@example.test', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit profile', exact: true })).toBeDisabled()
  await expect(page.getByText('WashGo Test Store', { exact: true })).toHaveCount(0)
  options.missingProfile = false
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Edit profile', exact: true })).toBeEnabled()
  await expect(page.getByText('59-X1 12345', { exact: true })).toBeVisible()
})

test('profile validates, saves only supported fields, and refreshes account identity', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/shipper/profile')
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Email', { exact: true })).toBeDisabled()
  await expect(dialog.getByLabel('Email', { exact: true })).toHaveValue('driver@example.test')
  await dialog.locator('#shipper-fullName').fill('Updated Driver')
  await dialog.locator('#shipper-phone').fill('123')
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(state.writes).toHaveLength(0)
  await dialog.locator('#shipper-phone').fill('0901111222')
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.writes).toEqual([{ fullName: 'Updated Driver', phone: '0901111222', vehicleType: 1, vehiclePlate: '59-X1 12345', avatarUrl: null, expectedRevision: 'profile-v1', operationId: expect.any(String) }])
  await expect(page.locator('header').first()).toContainText('Updated Driver')
})

test('unknown profile write is not retried and a stale profile cannot be overwritten', async ({ page }) => {
  const state = await setup(page, { unknown: true })
  await page.goto('/shipper/profile')
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('unknown')
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click()
  state.profile.phone = '0909999888'
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled()
  await page.getByRole('dialog').getByRole('button', { name: 'Check result', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
})

test('mobile dark navigation and independent task retry remain usable', async ({ page }) => {
  const state = await setup(page, { dark: true })
  state.failTasks = true
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/shipper')
  await expect(page.getByRole('heading', { name: 'Delivery overview', exact: true })).toBeVisible()
  await expect(page.getByText('WG-DONE-1', { exact: true })).toHaveCount(0)
  state.failTasks = false
  await page.getByRole('button', { name: 'Try again', exact: true }).first().click()
  await expect(page.getByText('WG-TEST-1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Shipper navigation', exact: true }).getByRole('link', { name: 'Overview', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('dashboard period presets and custom range filter completions and survive reload', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/shipper')
  await expect.poll(() => state.historyFilters.length).toBeGreaterThan(0)
  expect(state.historyFilters.at(-1).period).toBe('day')
  await expect(page.locator('main').getByText('WashGo Test Store', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Week', exact: true }).click()
  await expect(page).toHaveURL(/period=week/)
  await expect.poll(() => state.historyFilters.at(-1).period).toBe('week')
  await page.getByRole('button', { name: 'Month', exact: true }).click()
  await expect(page).toHaveURL(/period=month/)
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await page.getByLabel('From date', { exact: true }).fill('2026-10-01')
  await page.getByLabel('To date', { exact: true }).fill('2026-10-05')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect.poll(() => state.historyFilters.at(-1).fromDate).toBe(String(Date.parse('2026-10-01T00:00:00+07:00') / 1000))
  expect(state.historyFilters.at(-1).toDate).toBe(String(Date.parse('2026-10-05T23:59:59+07:00') / 1000))
  await page.reload()
  await expect(page.getByRole('button', { name: 'Custom', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await expect(page.getByLabel('From date', { exact: true })).toHaveValue('2026-10-01')
})

test('profile displays merchant contact when enriched and edit action stays next to refresh', async ({ page }) => {
  const state = await setup(page)
  state.profile.merchantPhone = '0904444555'
  state.profile.merchantImageUrls = ['/uploads/mock/merchant.png']
  await page.route('**/uploads/mock/merchant.png', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY0sAAAAASUVORK5CYII=', 'base64') }))
  await page.goto('/shipper/profile')
  const header = page.locator('main header').first()
  await expect(header.getByRole('button', { name: 'Edit profile', exact: true })).toBeEnabled()
  await expect(header.getByRole('button', { name: 'Refresh', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '0904444555', exact: true })).toHaveAttribute('href', 'tel:0904444555')
  await expect(page.getByRole('img', { name: 'WashGo Test Store', exact: true })).toBeVisible()
})
