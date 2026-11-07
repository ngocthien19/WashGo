import { merchantSession } from './helpers/merchantSession'
import { expect, test } from '@playwright/test'

const orderId = '11111111-1111-4111-8111-111111111111'
async function setup(page, options = {}) {
  const state = { ordersError: false, profileError: false, settlementError: false, empty: false, calls: [], submitted: null, updateError: false, updates: 0 }
  if (!options.guest) {
    await merchantSession(page, options)
  }
  const counts = { 2: 3, 4: 2, 5: 1, 8: 5, 10: 2, 12: 10, 13: 1, 99: 4 }
  await page.route('**/api/**', (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '')
    state.calls.push(path)
    const data = (value) => route.fulfill({ json: { succeeded: true, data: value } })
    const list = (items, total = items.length) => route.fulfill({ json: { succeeded: true, list: items, total, currentPage: 1, totalPages: total ? 1 : 0 } })
    const fail = () => route.fulfill({ status: 500, json: { succeeded: false, message: 'merchant.invalidResponse' } })
    if (path === '/auth/me') {
      return data({ id: 'merchant-test', fullName: 'Alex Store Owner', email: 'merchant@example.test', role: options.role || 'Merchant' })
    }
    if (path === '/auth/logout') {
      return data(true)
    }
    if (options.role === 'Customer' && ['/customer/services/filter', '/customer/lockers'].includes(path)) {
      return list([], 0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: { succeeded: false } })
    }
    if (path === '/notification/unread-count') {
      return data(1)
    }
    if (path === '/notification') {
      return list([{ id: 'notice-1', type: 20, title: 'New order assigned', content: 'An order has been assigned to your store.', createdOn: 1794009600, isRead: true, linkType: 'order', linkId: orderId }])
    }
    if (path === '/merchant-profile') {
      return state.profileError ? fail() : data({ id: 'merchant-test', businessName: 'WashGo Ben Thanh', address: '123 Test Street', city: 'Ho Chi Minh City', phone: '0901234567', email: 'shop@example.test', openingHours: '08:00–20:00', rating: 4.8, totalOrders: 28, status: 1, contractStartDate: '2023-03-15T00:00:00Z', pendingRequest: state.submitted, ...options.profile })
    }
    if (path === '/files/images') {
      return data({ url: '/uploads/mock/store.png' })
    }
    if (path === '/merchant-profile/update-requests') {
      state.updates++
      const body = request.postDataJSON()
      expect(Object.keys(body).sort()).toEqual(['address', 'businessName', 'imageUrls', 'openingHours', 'phone'])
      if (state.updateError) {
        return fail()
      }
      state.submitted = { id: orderId, status: 1, proposed: body }
      return data(state.submitted)
    }
    if (path === '/wash-order/filter') {
      const body = request.postDataJSON()
      expect(body).not.toHaveProperty('merchantId')
      expect(body).not.toHaveProperty('customerId')
      if (state.ordersError) {
        return fail()
      }
      if (state.empty) {
        return list([], 0)
      }
      if (body.status) {
        return list([], counts[body.status] || 0)
      }
      return list([{ id: orderId, orderCode: 'WG-MERCHANT-123', merchantOrderCode: 'BT-001', status: 4, serviceNames: ['Everyday wash'], lockerName: 'Ben Thanh Locker', createdOn: 1794009600 }], 28)
    }
    if (path === `/wash-order/${orderId}`) {
      return data({ id: orderId, orderCode: 'WG-MERCHANT-123', status: 4, lockerName: 'Ben Thanh Locker', boxNumber: '3', finalAmount: 85000, createdOn: 1794009600, items: [{ id: 'item-1', serviceName: 'Everyday wash', quantity: 1, subTotal: 85000 }] })
    }
    if (path === '/finance/settlements/filter') {
      expect(request.postDataJSON()).toEqual({ page: 1, take: 4 })
      return state.settlementError ? fail() : list(state.empty ? [] : [{ id: 'settlement-1', payoutAmount: 400000, status: 2, periodFrom: '2026-10-01T00:00:00Z', periodTo: '2026-10-31T23:59:59Z' }])
    }
    // No Admin revenue API, customer data endpoint or real backend writes are permitted.
    throw new Error(`Unexpected API: ${path}`)
  })
  return state
}

test('merchant dashboard uses scoped server totals, charts, order preview and store profile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const state = await setup(page)
  await page.goto('/merchant')
  await expect(page.getByRole('heading', { name: 'Store overview', exact: true })).toBeVisible()
  await expect(page.getByText('WashGo Ben Thanh', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Orders by status group' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Processing: 3', exact: true })).toBeVisible()
  await expect(page.getByText('400,000', { exact: false })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'View order WG-MERCHANT-123', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'WG-MERCHANT-123', exact: true })).toBeVisible()
  await expect(page).toHaveTitle('Order details WG-MERCHANT-123 | WashGo')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Open account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Store profile', exact: true }).click()
  await expect(page).toHaveURL('/merchant/profile')
  const profile = page.locator('main')
  await expect(profile).toContainText('123 Test Street')
  await expect(profile.getByRole('heading', { name: 'Store rating', exact: true }).locator('..')).toContainText('4.8')
  await expect(profile.getByText('Active', { exact: true })).toBeVisible()
  await expect(profile.getByText('Tax code', { exact: true })).toBeVisible()
  await expect(profile.getByText('Business license', { exact: true })).toBeVisible()
  await expect(profile.getByText('Total revenue', { exact: true })).toBeVisible()
  await expect(profile.getByText('Ho Chi Minh City', { exact: true })).toBeVisible()
  await expect(profile.getByText('Date joined', { exact: true }).locator('..')).toContainText('Not updated')
  await expect(profile.getByText('Not updated', { exact: true })).toHaveCount(4)
  const address = await profile.getByText('Business address', { exact: true }).boundingBox()
  const city = await profile.getByText('City / Province', { exact: true }).boundingBox()
  expect(city.x).toBeGreaterThan(address.x)
  expect(Math.abs(city.y - address.y)).toBeLessThan(2)
  expect(state.calls.some((path) => path.includes('revenue-report'))).toBe(false)
})

test('mobile header, theme, language and notifications remain within Merchant routes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await setup(page, { dark: true })
  await page.goto('/merchant')
  await expect(page.getByRole('button', { name: 'Switch to light mode', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Open Merchant navigation', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Merchant navigation' })).toBeVisible()
  await page.getByRole('link', { name: 'Overview', exact: true }).click()
  await page.getByRole('button', { name: 'Change language', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tổng quan cửa hàng', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Thông báo', exact: true }).click()
  const popup = page.getByRole('dialog', { name: 'Thông báo', exact: true })
  await expect(popup.getByText('New order assigned')).toBeVisible()
  await popup.getByRole('link', { name: 'Tất cả thông báo', exact: true }).click()
  await expect(page).toHaveURL('/merchant/notifications')
  await page.getByRole('button', { name: 'Xem chi tiết', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/merchant\\?order=${orderId}$`))
  await expect(page.getByRole('dialog', { name: 'WG-MERCHANT-123' })).toBeVisible()
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('empty, error and retry states do not invent revenue or order counts', async ({ page }) => {
  const state = await setup(page)
  state.ordersError = true
  state.settlementError = true
  await page.goto('/merchant')
  await expect(page.getByRole('alert')).toHaveCount(3)
  state.ordersError = false
  state.settlementError = false
  state.empty = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(page.getByText('No orders are available for this chart yet.')).toBeVisible()
  await expect(page.getByText('No settlements have been finalized yet.')).toBeVisible()
})

test('guest cannot access Merchant dashboard', async ({ page }) => {
  await setup(page, { guest: true })
  await page.goto('/merchant')
  await expect(page).toHaveURL('/login')
})

test('full-height sidebar collapses, expands and signs out from its bottom action', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await setup(page)
  await page.goto('/merchant')
  const sidebar = page.locator('aside')
  await expect(sidebar.getByText('Store profile', { exact: true })).toHaveCount(0)
  expect((await sidebar.boundingBox()).y).toBe(0)
  await sidebar.hover()
  await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click()
  await expect(sidebar).toHaveCSS('width', '80px')
  await expect(sidebar.getByRole('link', { name: 'Overview', exact: true })).toBeVisible()
  await sidebar.getByRole('link', { name: 'Overview', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toHaveText('Overview')
  const tooltipBounds = await page.getByRole('tooltip').boundingBox()
  const sidebarBounds = await sidebar.boundingBox()
  expect(tooltipBounds.x).toBeGreaterThan(sidebarBounds.x + sidebarBounds.width)
  const arrowBounds = await page.getByRole('tooltip').locator('[data-side]').boundingBox()
  const textStart = await page.getByRole('tooltip').evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element.firstChild)
    return range.getBoundingClientRect().x
  })
  expect(arrowBounds.x + arrowBounds.width).toBeLessThan(textStart)
  await sidebar.getByRole('link', { name: 'Shipper management', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('Shipper management')
  await expect(page.getByRole('button', { name: 'Expand navigation', exact: true })).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Expand navigation', exact: true }).click()
  await expect(sidebar).toHaveCSS('width', '256px')
  const logout = sidebar.getByRole('button', { name: 'Sign out', exact: true })
  expect((await logout.boundingBox()).y).toBeGreaterThan(900)
  await logout.click()
  await expect(page).toHaveURL('/login')
})

test('profile includes optional backend fields and fits narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await setup(page, { dark: true, profile: { taxCode: '0312345678', openingHours: null } })
  await page.goto('/merchant')
  await page.getByRole('button', { name: 'Open account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Store profile', exact: true }).click()
  const profile = page.locator('main')
  await expect(profile).toContainText('0312345678')
  await expect(profile.getByText('Opening hours', { exact: true })).toBeVisible()
  expect(await profile.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
})

test('Customer role is redirected without querying Merchant data', async ({ page }) => {
  const state = await setup(page, { role: 'Customer' })
  await page.goto('/merchant')
  await expect(page).toHaveURL('/customer')
  expect(state.calls).not.toContain('/merchant-profile')
  expect(state.calls).not.toContain('/wash-order/filter')
})

test('profile edit uploads photos and submits a pending request without replacing approved information', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/profile')
  await expect(page).toHaveTitle('Store profile | WashGo')
  await page.getByRole('button', { name: 'Edit store profile', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit store profile', exact: true })
  await expect(dialog.getByLabel('City / Province', { exact: true })).toHaveValue('Ho Chi Minh City')
  await expect(dialog.getByLabel('City / Province', { exact: true })).toBeEditable()
  await expect(dialog.getByLabel('City / Province', { exact: true })).toHaveAttribute('required', '')
  const address = await dialog.getByLabel('Business address', { exact: true }).boundingBox()
  const city = await dialog.getByLabel('City / Province', { exact: true }).boundingBox()
  expect(city.x).toBeGreaterThan(address.x)
  expect(Math.abs(city.y - address.y)).toBeLessThan(2)
  await dialog.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('You have not changed any information.')
  await dialog.getByLabel('Business name').fill('Updated store name')
  await dialog.getByLabel('Opening hours').fill('09:00 - 21:00')
  await dialog.getByLabel('Add photos').setInputFiles({ name: 'store.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCGsAAAAASUVORK5CYII=', 'base64') })
  await dialog.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Edit store profile', exact: true })).toBeDisabled()
  await expect(page.locator('main')).toContainText('Your profile update is awaiting Admin approval.')
  await expect(page.locator('main').getByText('Updated store name', { exact: true })).toHaveCount(0)
  expect(state.submitted.proposed.businessName).toBe('Updated store name')
  expect(state.submitted.proposed.imageUrls).toEqual(['/uploads/mock/store.png'])
  expect(state.updates).toBe(1)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Edit store profile', exact: true })).toBeDisabled()
})

test('uncertain submission locks resubmission until the profile is checked again', async ({ page }) => {
  const state = await setup(page)
  state.updateError = true
  await page.goto('/merchant/profile')
  await page.getByRole('button', { name: 'Edit store profile', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit store profile', exact: true })
  await dialog.getByLabel('Business name').fill('Updated store name')
  await dialog.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('The submission outcome is unknown.')
  await expect(dialog.getByRole('button', { name: 'Submit for approval', exact: true })).toBeDisabled()
  expect(state.updates).toBe(1)
  const reads = state.calls.filter((path) => path === '/merchant-profile').length
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await expect.poll(() => state.calls.filter((path) => path === '/merchant-profile').length).toBeGreaterThan(reads)
})

test('city is required and unsupported city changes never silently drop data or upload files', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/profile')
  await page.getByRole('button', { name: 'Edit store profile', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit store profile', exact: true })
  const city = dialog.getByLabel('City / Province', { exact: true })
  await city.fill('')
  await dialog.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  expect(await city.evaluate((element) => element.validity.valueMissing)).toBe(true)
  expect(state.updates).toBe(0)
  await city.fill('Another city')
  await dialog.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('City / Province changes cannot be submitted for approval yet.')
  await expect(city).toHaveValue('Another city')
  expect(state.updates).toBe(0)
  expect(state.calls).not.toContain('/files/images')
})

test('merchant map previews and cancels without saving, then applies address and city to the edit draft', async ({ page }) => {
  const state = await setup(page, { profile: { city: 'Thành phố Hồ Chí Minh' } })
  await page.route('https://tile.openstreetmap.de/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path fill="#e6edf4" d="M0 0h256v256H0z"/></svg>' }))
  const requests = []
  await page.route('**/reverse?**', (route) => {
    requests.push(route.request())
    return route.fulfill({ json: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { housenumber: '123', street: 'Lê Lợi', district: 'Phường Bến Thành', state: 'Thành phố Hồ Chí Minh' } }] } })
  })
  await page.goto('/merchant/profile')
  await page.getByRole('button', { name: 'Edit store profile', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Edit store profile', exact: true })
  const openMap = edit.getByRole('button', { name: 'Choose on map', exact: true })
  await openMap.click()
  const map = page.getByRole('dialog', { name: 'Choose address on map', exact: true })
  await expect(map.getByRole('button', { name: 'Apply address', exact: true })).toBeDisabled()
  expect(requests).toHaveLength(0)
  await map.getByRole('button', { name: 'Choose map center', exact: true }).click()
  await expect(map.getByText('123 Lê Lợi, Phường Bến Thành', { exact: true })).toBeVisible()
  await map.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(edit.getByLabel('Business address', { exact: true })).toHaveValue('123 Test Street')
  await openMap.click()
  await map.getByRole('button', { name: 'Choose map center', exact: true }).click()
  await expect(map.getByRole('button', { name: 'Apply address', exact: true })).toBeEnabled()
  await map.getByRole('button', { name: 'Apply address', exact: true }).click()
  await expect(edit.getByLabel('Business address', { exact: true })).toHaveValue('123 Lê Lợi, Phường Bến Thành')
  await expect(edit.getByLabel('City / Province', { exact: true })).toHaveValue('Thành phố Hồ Chí Minh')
  expect(state.updates).toBe(0)
  expect(requests[0].headers().authorization).toBeUndefined()
  await edit.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(edit).toHaveCount(0)
  expect(state.submitted.proposed.address).toBe('123 Lê Lợi, Phường Bến Thành')
})
