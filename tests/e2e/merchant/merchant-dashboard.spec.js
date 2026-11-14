import { merchantSession } from '../helpers/merchantSession'
import { expect, test } from '@playwright/test'

const orderId = '11111111-1111-4111-8111-111111111111'
const uploadId = '22222222-2222-4222-8222-222222222222'
const licenseDocument = { fileId: orderId, originalFileName: 'license.pdf', contentType: 'application/pdf', size: 100, kind: 1, previewSupported: true, uploadedAt: '2026-11-10T01:00:00Z' }
test('partner reviews release moderated content without customer or order identity and do not invent a store rating', async ({ page }) => {
  await setup(page, {
    profile: { rating: null, hasRating: false, publicRatingCount: 0 },
    reviewRows: [
      { id: orderId, overallStars: 4, createdOn: 1794009600, contentReleased: false, comment: 'PRIVATE UNRELEASED', customerName: 'PRIVATE CUSTOMER', orderCode: 'PRIVATE ORDER', imageUrls: [], videoUrls: [] },
      { id: uploadId, overallStars: 5, createdOn: 1794009600, contentReleased: true, comment: 'Released service feedback', customerName: 'PRIVATE CUSTOMER', orderCode: 'PRIVATE ORDER', imageUrls: [], videoUrls: [] }
    ]
  })
  await page.goto('/merchant/profile')
  const rating = page.getByRole('heading', { name: 'Store rating', exact: true }).locator('..')
  await expect(rating).toContainText('—')
  const reviews = page.getByRole('heading', { name: 'Service reviews', exact: true }).locator('..')
  await expect(reviews).toContainText('Released service feedback')
  await expect(reviews).toContainText('Comments and media are available after moderation.')
  await expect(reviews).not.toContainText('PRIVATE')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

async function setup(page, options = {}) {
  const state = { ordersError: false, profileError: false, settlementError: false, empty: false, calls: [], submitted: null, updateError: false, updates: 0, documentUploads: 0, documentReads: [], documents: { [orderId]: licenseDocument }, deniedDocument: false, slaQueries: [] }
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
    if (path === '/notification/filter') {
      return data({ items: [{ id: 'notice-1', type: 20, title: 'New order assigned', content: 'An order has been assigned to your store.', createdOn: 1794009600, isRead: true, linkType: 'order', linkId: orderId }], total: 1, page: 1, take: 10, unreadTotal: 0, counts: [{ group: 'order', total: 1, unread: 0 }] })
    }
    if (path === '/rating/partner/filter') {
      return list(options.reviewRows || [], options.reviewRows?.length || 0)
    }
    if (path === '/merchant-profile') {
      return state.profileError ? fail() : data({ version: 'profile-version-1', id: 'merchant-test', businessName: 'WashGo Ben Thanh', address: '123 Test Street', city: 'Ho Chi Minh City', phone: '0901234567', email: 'shop@example.test', openingHours: '08:00–20:00', rating: 4.8, totalOrders: 28, status: 1, contractStartDate: '2023-03-15T00:00:00Z', pendingRequest: state.submitted, ...options.profile })
    }
    if (path === '/merchant-reports/lifetime') {
      return data(options.lifetime || { currency: 'VND', grossLaundryRevenue: 9000000, refunds: 1000000, netRevenue: 8000000, commission: 1600000, merchantPayout: 6400000, feesCollected: 10000, paidOrderCount: 10, commissionComplete: true, ordersWithoutCommissionSnapshot: 0, uncoveredNetAmount: 0, generatedAt: '2026-11-10T01:00:00Z' })
    }
    if (path === '/files/documents' && request.method() === 'POST') {
      state.documentUploads++
      expect(request.postData()).toContain('BusinessLicense')
      expect(request.postData()).not.toContain('name="merchantId"')
      state.documents[uploadId] = { ...licenseDocument, fileId: uploadId, originalFileName: 'new-license.pdf' }
      return data(state.documents[uploadId])
    }
    const privateDocument = path.match(/^\/files\/documents\/([^/]+)(\/download)?$/)
    if (privateDocument) {
      state.documentReads.push(path)
      if (state.deniedDocument) {
        return route.fulfill({ status: 403, json: { succeeded: false, message: 'Document access denied' } })
      }
      const file = state.documents[privateDocument[1]]
      if (privateDocument[2]) {
        return route.fulfill({ contentType: file.contentType, body: Buffer.from('%PDF-1.4 mock document') })
      }
      return data(file)
    }
    if (path === '/files/images') {
      return data({ url: '/uploads/mock/store.png' })
    }
    if (path === '/merchant-profile/update-requests') {
      state.updates++
      const body = request.postDataJSON()
      expect(Object.keys(body).every((key) => ['address', 'businessName', 'city', 'imageUrls', 'openingHours', 'phone', 'latitude', 'longitude', 'taxCode', 'businessLicenseDocumentId', 'removeBusinessLicenseDocument', 'operationId', 'expectedMerchantVersion'].includes(key))).toBe(true)
      expect(body.expectedMerchantVersion).toBe('profile-version-1')
      expect(body.operationId).toMatch(/^[a-f0-9-]{36}$/)
      if (state.updateError) {
        return fail()
      }
      state.submitted = { id: orderId, status: 1, proposed: body }
      return data(state.submitted)
    }
    if (path === '/merchant/dashboard') {
      state.dashboardQuery = Object.fromEntries(new URL(request.url()).searchParams)
      if (state.ordersError || state.settlementError) {
        return fail()
      }
      const keys = ['pending', 'deposited', 'collected', 'washing', 'drying', 'ironing', 'folding', 'awaitingPayment', 'paid', 'readyToReturn', 'returned', 'completed', 'movedToStorage', 'cancelled']
      const statuses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 99]
      return data({ totalOrders: state.empty ? 0 : 28, statusCounts: Object.fromEntries(keys.map((key, i) => [key, state.empty ? 0 : counts[statuses[i]] || 0])), latestOrders: state.empty ? [] : [{ id: orderId, orderCode: 'WG-MERCHANT-123', merchantOrderCode: 'BT-001', status: 4, serviceNames: ['Everyday wash'], lockerName: 'Ben Thanh Locker', createdOn: 1794009600 }], recentSettlements: state.empty ? [] : [{ id: 'settlement-1', payoutAmount: 400000, status: 2, periodFrom: '2026-10-01T00:00:00Z', periodTo: '2026-10-31T23:59:59Z' }], generatedAt: '2026-11-07T19:00:00' })
    }
    if (path === '/merchant-reports/overview') {
      state.revenueQuery = Object.fromEntries(new URL(request.url()).searchParams)
      if (state.revenueError) {
        return fail()
      }
      const kpi = (current) => ({ current, previous: 0, changePercent: null, isNew: true })
      return data({ currency: 'VND', period: 'month', kpis: { grossLaundryRevenue: kpi(1000000), refunds: kpi(100000), netRevenue: kpi(900000), commission: kpi(180000), merchantPayout: kpi(720000), ordersWithoutCommissionSnapshot: state.missingCommission ? 1 : 0 }, series: [{ index: 0, label: '01/11', netRevenue: 900000, computed: true }, { index: 1, label: '30/11', netRevenue: 0, computed: false }] })
    }
    if (path === '/merchant/sla-alerts') {
      const query = Object.fromEntries(new URL(request.url()).searchParams); state.slaQueries.push(query)
      if (state.alertsError) {
        return fail()
      }
      return data({ page: Number(query.page), take: Number(query.take), priorityTotal: state.empty ? 0 : 1, totalAlerts: state.empty ? 0 : 1, collectionAlertsCount: state.empty ? 0 : 1, processingAlertsCount: 0, returnAlertsCount: 0, serverNow: '2026-11-07T12:00:00Z', priorityOrders: state.empty ? [] : [{ orderId, orderCode: 'WG-MERCHANT-123', status: 2, alertType: 1, actionType: 1, overdueMinutes: 35, deadline: '2026-11-07T11:25:00Z', lockerName: 'Ben Thanh Locker', boxNumber: '3' }] })
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
  await expect(page.getByRole('heading', { name: 'Store overview', exact: true })).toBeVisible({ timeout: 15000 })
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
  await expect(profile.getByText('Not updated', { exact: true })).toHaveCount(2)
  const address = await profile.getByText('Business address', { exact: true }).boundingBox()
  const city = await profile.getByText('City / Province', { exact: true }).boundingBox()
  expect(city.x).toBeGreaterThan(address.x)
  expect(Math.abs(city.y - address.y)).toBeLessThan(2)
  expect(state.calls).toContain('/merchant/dashboard')
  expect(state.calls).not.toContain('/wash-order/filter')
  expect(state.calls).not.toContain('/finance/settlements/filter')
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
  await expect(page).toHaveURL(new RegExp(`/merchant/orders/${orderId}$`))
  await expect(page.getByRole('heading', { name: 'WG-MERCHANT-123', exact: true })).toBeVisible()
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
  await expect(page).toHaveURL('/')
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
  await expect(page).toHaveURL('/')
  expect(state.calls).not.toContain('/merchant-profile')
  expect(state.calls).not.toContain('/wash-order/filter')
})

test('profile edit uploads photos and submits a pending request without replacing approved information', async ({ page }) => {
  const state = await setup(page, { profile: { taxCode: '0312345678' } })
  await page.goto('/merchant/profile')
  await expect(page).toHaveTitle('Store profile | WashGo')
  await page.getByRole('button', { name: 'Edit store profile', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit store profile', exact: true })
  await expect(dialog.getByLabel('Tax code', { exact: true })).toHaveValue('0312345678')
  await expect(dialog.getByLabel('Tax code', { exact: true })).toBeEditable()
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

test('city is required and address changes need a confirmed map location before submission', async ({ page }) => {
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
  await expect(dialog.getByRole('alert')).toContainText('Choose the location on the map')
  expect(state.updates).toBe(0)
  expect(state.calls).not.toContain('/files/images')
})

test('merchant map previews and cancels without saving, then applies address and city to the edit draft', async ({ page }) => {
  const state = await setup(page, { profile: { city: 'Old city' } })
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
  expect(state.submitted.proposed.city).toBeDefined()
  expect(state.submitted.proposed.city).toBe('Thành phố Hồ Chí Minh')
  expect(Number.isFinite(state.submitted.proposed.latitude)).toBe(true)
  expect(Number.isFinite(state.submitted.proposed.longitude)).toBe(true)
  expect(state.submitted.proposed.address).toBe('123 Lê Lợi, Phường Bến Thành')
})

test('dashboard shows transaction revenue and server SLA actions, isolates failures and refreshes', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant')
  const revenue = page.getByRole('heading', { name: 'Revenue for this period', exact: true }).locator('..')
  await expect(revenue.getByText('720,000', { exact: true }).first()).toBeVisible()
  await expect(revenue.getByRole('group', { name: 'Daily net revenue', exact: true })).toBeVisible()
  await revenue.getByText('View chart data', { exact: true }).click()
  await expect(revenue.getByRole('table')).toContainText('900,000')
  await expect(revenue.getByRole('row', { name: /30\/11/ })).toContainText('Not yet computed')
  await expect(page.getByText('35 minutes overdue', { exact: false })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Assign collection', exact: true })).toHaveAttribute('href', `/merchant/orders/${orderId}`)
  state.missingCommission = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(revenue).toContainText('no confirmed historical commission rate')
  const payout = revenue.getByText('Payout after commission', { exact: true }).locator('..')
  await expect(payout).toContainText('—')
  state.revenueError = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(revenue.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Assign collection', exact: true })).toBeVisible()
  state.revenueError = false
  await revenue.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(revenue.getByRole('alert')).toHaveCount(0)
})

test('profile distinguishes no public ratings and shows the backend membership date', async ({ page }) => {
  await setup(page, { profile: { rating: 5, publicRatingCount: 0, joinedAt: '2024-03-15T00:00:00Z' } })
  await page.goto('/merchant/profile')
  await expect(page.getByText('No public reviews yet', { exact: true })).toBeVisible()
  const rating = page.getByRole('heading', { name: 'Store rating', exact: true }).locator('..')
  await expect(rating).toContainText('—')
  await expect(rating).not.toContainText('/ 5')
  await expect(page.getByText('Date joined', { exact: true }).locator('..')).toContainText('Mar 15, 2024')
})


test('dashboard period filters keep matching server ranges and survive reload', async ({ page }) => {
  const state = await setup(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/merchant')
  await page.getByRole('button', { name: 'Day', exact: true }).click()
  await expect(page).toHaveURL(/period=day/)
  await expect.poll(() => state.revenueQuery?.from === state.revenueQuery?.to).toBe(true)
  await expect.poll(() => Number(state.dashboardQuery?.toDate) - Number(state.dashboardQuery?.fromDate)).toBe(86399)
  await page.getByRole('button', { name: 'Week', exact: true }).click()
  await expect.poll(() => Number(state.dashboardQuery?.toDate) - Number(state.dashboardQuery?.fromDate)).toBe(7 * 86400 - 1)
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  const trigger = await page.getByRole('button', { name: 'Custom', exact: true }).boundingBox()
  const popup = await page.getByRole('dialog', { name: 'Choose date range', exact: true }).boundingBox()
  expect(popup.y).toBeGreaterThanOrEqual(trigger.y + trigger.height)
  await page.getByLabel('From date', { exact: true }).fill('2026-10-01')
  await page.getByLabel('To date', { exact: true }).fill('2026-10-15')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page).toHaveURL(/period=custom/)
  await expect.poll(() => state.revenueQuery?.from).toBe('2026-10-01')
  await expect.poll(() => state.revenueQuery?.to).toBe('2026-10-15')
  expect(Number(state.dashboardQuery.fromDate)).toBe(Date.parse('2026-10-01T00:00:00+07:00') / 1000)
  await page.reload()
  await expect(page.getByRole('dialog', { name: 'Choose date range', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Custom', exact: true }).click()
  await expect(page.getByLabel('From date', { exact: true })).toHaveValue('2026-10-01')
  await page.keyboard.press('Escape')
  await expect(page.getByText('35 minutes overdue', { exact: false })).toBeVisible()
  const chart = await page.getByRole('heading', { name: 'Orders by status group', exact: true }).locator('..').boundingBox()
  const alerts = await page.getByRole('heading', { name: /Orders needing attention/, level: 2 }).locator('..').boundingBox()
  // The current layout places the status/distribution charts above the full-width alerts.
  expect(alerts.y).toBeGreaterThanOrEqual(chart.y + chart.height)
  state.empty = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  const empty = page.getByText('No orders are available for this chart yet.', { exact: true })
  await expect(empty).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Orders by status group', exact: true })).toBeVisible()
  const distribution = empty.locator('..')
  await expect(distribution.locator('svg circle')).toHaveCount(1)
  await expect(distribution.getByRole('button')).toHaveCount(7)
  await expect(distribution.getByRole('button').first()).toHaveAttribute('aria-label', /: 0$/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})


test('Merchant submits tax code and private PDF license for approval while current legal details stay unchanged', async ({ page }) => {
  const profile = { taxCode: '0312345678', businessLicenseDocumentId: orderId, documents: [licenseDocument] }
  const state = await setup(page, { profile })
  await page.goto('/merchant/profile')
  await expect(page.getByRole('heading', { name: 'Lifetime finances', exact: true })).toBeVisible()
  const financial = page.getByRole('heading', { name: 'Lifetime finances', exact: true }).locator('..')
  await expect(financial).toContainText('8,000,000')
  await page.getByRole('button', { name: 'Edit store profile', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Edit store profile', exact: true })
  await dialog.getByLabel('Tax code', { exact: true }).fill('123')
  await dialog.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('10 digits')
  expect(state.updates).toBe(0)
  await dialog.getByLabel('Tax code', { exact: true }).fill('0123456789-001')
  await dialog.getByLabel('Upload business license', { exact: true }).setInputFiles({ name: 'wrong.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(dialog.getByRole('alert')).toContainText('10 MB')
  expect(state.documentUploads).toBe(0)
  await dialog.getByLabel('Upload business license', { exact: true }).setInputFiles({ name: 'new-license.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 mock') })
  await expect(dialog.getByText('new-license.pdf', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.submitted.proposed).toMatchObject({ taxCode: '0123456789-001', businessLicenseDocumentId: uploadId })
  expect(state.submitted.proposed).not.toHaveProperty('slaDocumentId')
  expect(state.submitted.proposed).not.toHaveProperty('businessLicense')
  await expect(page.getByText('0312345678', { exact: true })).toBeVisible()
  await expect(page.getByText('license.pdf', { exact: true })).toBeVisible()
  expect(state.documentUploads).toBe(1)
})

test('private PDF preview and download use authenticated endpoints and permission failures remain visible', async ({ page }) => {
  const state = await setup(page, { profile: { businessLicenseDocumentId: orderId, documents: [licenseDocument] } })
  await page.goto('/merchant/profile')
  await page.getByRole('button', { name: 'Preview PDF', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('iframe')).toHaveAttribute('src', /^blob:/)
  expect(state.documentReads).toContain(`/files/documents/${orderId}/download`)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('license.pdf')
  state.deniedDocument = true
  await page.getByRole('button', { name: 'Preview PDF', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('You do not have permission')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('Admin-issued Word SLA is download-only while Merchant edits the business license', async ({ page }) => {
  const sla = { ...licenseDocument, fileId: uploadId, kind: 3, originalFileName: 'sla.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', previewSupported: false }
  const state = await setup(page, { profile: { slaDocumentId: uploadId, documents: [sla] } })
  state.documents[uploadId] = sla
  await page.goto('/merchant/profile')
  await expect(page.getByText('sla.docx', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview PDF', exact: true })).toHaveCount(0)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('sla.docx')
  await page.getByRole('button', { name: 'Edit store profile', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Upload business license', { exact: true })).toHaveCount(1)
  await expect(dialog.locator('input[type="file"]')).toHaveCount(2)
})

test('license removal remains an approval proposal and stale profiles cannot be submitted', async ({ page }) => {
  const profile = { businessLicenseDocumentId: orderId, documents: [licenseDocument] }
  const state = await setup(page, { profile })
  await page.goto('/merchant/profile')
  await page.getByRole('button', { name: 'Edit store profile', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Propose document removal', exact: true }).click()
  await dialog.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.submitted.proposed.removeBusinessLicenseDocument).toBe(true)
  await expect(page.getByText('license.pdf', { exact: true })).toBeVisible()
  state.submitted = null
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.getByRole('button', { name: 'Edit store profile', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Business name', { exact: true }).fill('Proposed name')
  profile.phone = '0987654321'
  await dialog.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('profile has changed')
  expect(state.updates).toBe(1)
})

test('incomplete lifetime commission coverage does not display provisional earnings as confirmed', async ({ page }) => {
  await setup(page, { lifetime: { currency: 'VND', grossLaundryRevenue: 1000, refunds: 200, netRevenue: 800, commission: 0, merchantPayout: 800, feesCollected: 0, paidOrderCount: 1, commissionComplete: false, ordersWithoutCommissionSnapshot: 1, uncoveredNetAmount: 800, generatedAt: '2026-11-10T01:00:00Z' } })
  await page.goto('/merchant/profile')
  const section = page.getByRole('heading', { name: 'Lifetime finances', exact: true }).locator('..')
  await expect(section.getByText('Pending reconciliation', { exact: true })).toHaveCount(2)
  await expect(section.getByRole('status')).toContainText('missing locked commission rates')
})

test('SLA alerts page and filter on the server while preserving global alert counts', async ({ page }) => {
  await setup(page)
  const calls = []
  await page.route('**/api/merchant/sla-alerts?*', (route) => {
    const query = new URL(route.request().url()).searchParams
    calls.push(Object.fromEntries(query))
    const pageIndex = Number(query.get('page')), take = Number(query.get('take')), type = Number(query.get('alertType'))
    const all = Array.from({ length: 7 }, (_, index) => ({ orderId: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`, orderCode: `SLA-${index + 1}`, status: index < 5 ? 2 : 9, alertType: index < 5 ? 1 : 3, actionType: index < 5 ? 1 : 3, overdueMinutes: 60, deadline: '2026-11-10T01:00:00Z', lockerName: 'Test Locker', boxNumber: '3' }))
    const filtered = type ? all.filter((row) => row.alertType === type) : all
    return route.fulfill({ json: { succeeded: true, data: { page: pageIndex, take, priorityTotal: filtered.length, totalAlerts: 7, collectionAlertsCount: 5, processingAlertsCount: 0, returnAlertsCount: 2, serverNow: '2026-11-10T02:00:00Z', priorityOrders: filtered.slice((pageIndex - 1) * take, pageIndex * take) } } })
  })
  await page.goto('/merchant')
  await expect(page.getByText('SLA-5', { exact: true })).toBeVisible()
  await expect(page.getByText('SLA-6', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page.getByText('SLA-6', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'SLA alert type', exact: true }).click()
  await page.getByRole('option').filter({ hasText: /return/i }).click()
  await expect(page.getByText('SLA-7', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'List filters', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Orders needing attention list', exact: true })).toBeVisible()
  await expect(page.getByText('2 matching orders', { exact: true })).toBeVisible()
  expect(calls.at(-1)).toMatchObject({ page: '1', take: '5', alertType: '3' })
})
