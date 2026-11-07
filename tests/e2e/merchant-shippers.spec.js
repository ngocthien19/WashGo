import { test, expect } from '@playwright/test'
import { merchantSession } from './helpers/merchantSession'

const id = '22222222-2222-4222-8222-222222222222'
async function setup(page, options = {}) {
  await merchantSession(page, options)
  const state = { summaryError: false, summaryCalls: [], filters: [], writes: [], fail: false, readFail: false, tasks: 0, uploads: 0, rows: [{ id, fullName: 'Test Driver', phone: '0901234567', email: 'driver@example.test', vehicleType: 1, vehiclePlate: '59-A1234', isActive: true, status: 1, totalDeliveries: 12, activeTaskCount: 0, rating: 4.8, identityNumber: '123456789', identityImageUrls: [], createdAt: '2026-10-01T00:00:00Z' }] }
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '').replace(/\/$/, '')
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', role: 'Merchant', fullName: 'Store Owner' })
    }
    if (path === '/merchant-profile') {
      return ok({ id: 'merchant-test', businessName: 'Test Store', status: 1 })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === '/files/images') {
      return ok({ url: `/uploads/mock/identity-${++state.uploads}.png` })
    }
    if (path === '/shipper/filter') {
      const body = request.postDataJSON()
      expect(body).not.toHaveProperty('merchantId')
      if (body.take === 1) {
        state.summaryCalls.push(body)
        if (state.summaryError) {
          return route.fulfill({ status: 500, json: { succeeded: false, message: 'merchant.invalidResponse' } })
        }
        const total = body.status ? { 1: 12, 2: 8, 3: 5 }[body.status] : body.isActive === false ? 5 : body.isActive === true ? 20 : 25
        return route.fulfill({ json: { succeeded: true, list: [], total } })
      }
      state.filters.push(body)
      const rows = state.rows.filter((row) => (!body.keyword || row.fullName.includes(body.keyword)) && (body.isActive === undefined || body.isActive === row.isActive) && (!body.status || body.status === row.status))
      return route.fulfill({ json: { succeeded: true, list: rows, total: rows.length ? 25 : 0 } })
    }
    if (path === `/shipper/${id}` && request.method() === 'GET') {
      if (state.readFail) {
        return route.fulfill({ status: 403, json: { succeeded: false } })
      }
      return ok({ ...state.rows[0], activeTaskCount: state.tasks })
    }
    if ((path === '/shipper' && request.method() === 'POST') || (path === `/shipper/${id}` && request.method() === 'PUT')) {
      const body = request.postDataJSON()
      expect(body).not.toHaveProperty('merchantId')
      expect(body).not.toHaveProperty('status')
      state.writes.push(body)
      if (state.fail) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      if (request.method() === 'PUT') {
        state.rows[0] = { ...state.rows[0], ...body }
      } else {
        state.rows.push({ ...state.rows[0], ...body, id: 'new-shipper' })
      }
      return ok({ ...state.rows[0], ...body, id })
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return state
}

async function rowAction(page, name) {
  await page.getByRole('button', { name: 'Actions for Test Driver', exact: true }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}

test('shipper list: URL search, false availability, paging and fresh details', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/shippers')
  await expect(page.getByRole('table')).toContainText('Test Driver')
  await rowAction(page, 'View Test Driver')
  await expect(page.getByRole('dialog')).toContainText('123456789')
  const dialog = page.getByRole('dialog')
  const heroBounds = await dialog.getByRole('heading', { name: 'Test Driver', exact: true }).locator('..').locator('..').boundingBox()
  const metricsBounds = await dialog.getByText('Deliveries completed', { exact: true }).locator('..').locator('..').boundingBox()
  const infoBounds = await dialog.getByRole('heading', { name: 'Shipper information', exact: true }).locator('..').boundingBox()
  expect(metricsBounds.y - heroBounds.y - heroBounds.height).toBeGreaterThanOrEqual(19)
  expect(infoBounds.y - metricsBounds.y - metricsBounds.height).toBeGreaterThanOrEqual(19)
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.reload()
  await expect(page.getByRole('table')).toBeVisible()
  expect(state.filters.at(-1).page).toBe(2)
  await page.getByRole('searchbox', { name: 'Search shippers' }).fill('Test')
  await page.getByRole('searchbox', { name: 'Search shippers' }).press('Enter')
  await expect(page).toHaveURL(/keyword=Test/)
  await expect(page.getByRole('table')).toBeVisible()
  await expect.poll(() => state.filters.at(-1).keyword).toBe('Test')
  await page.getByRole('combobox', { name: 'Work availability' }).click()
  await page.getByRole('option', { name: 'On leave', exact: true }).click()
  await expect(page.getByText('No shippers match your search.')).toBeVisible()
  expect(state.filters.at(-1).isActive).toBe(false)
})

test('create validates fields; uncertain response locks repeat submissions', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/shippers')
  await page.getByRole('button', { name: 'Add shipper', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Save shipper' }).click()
  await expect(dialog.getByText('Enter a name, up to 100 characters.')).toBeVisible()
  expect(state.writes).toHaveLength(0)
  await dialog.getByLabel('Full name').fill('New Driver')
  await dialog.getByLabel('Phone number').fill('0909876543')
  await dialog.getByLabel('Email', { exact: false }).fill('new@example.test')
  await dialog.getByLabel('Vehicle plate', { exact: true }).fill('59-B1234')
  state.fail = true
  await dialog.getByRole('button', { name: 'Save shipper' }).click()
  await expect(dialog.getByRole('alert')).toContainText('save outcome is unknown')
  await expect(dialog.getByRole('button', { name: 'Save shipper' })).toBeDisabled()
  expect(state.writes).toHaveLength(1)
})

test('editing cannot put a shipper with active tasks on leave', async ({ page }) => {
  const state = await setup(page)
  state.tasks = 2
  await page.goto('/merchant/shippers')
  await rowAction(page, 'View Test Driver')
  await page.getByRole('button', { name: 'Edit shipper', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('combobox', { name: 'Work availability' }).click()
  await page.getByRole('option', { name: 'On leave', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save shipper' }).click()
  await expect(dialog.getByRole('alert')).toContainText('active tasks')
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('combobox', { name: 'Work availability' }).click()
  await page.getByRole('option', { name: 'Working', exact: true }).click()
  await dialog.getByLabel('Full name').fill('Updated Driver')
  await dialog.getByRole('button', { name: 'Save shipper' }).click()
  await expect(page.getByRole('table')).toContainText('Updated Driver')
  expect(state.writes).toHaveLength(1)
})

test('creates an account with owned photo URLs and no role or password payload', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/shippers')
  await page.getByRole('button', { name: 'Add shipper', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Full name').fill('New Driver')
  await dialog.getByLabel('Phone number').fill('0909876543')
  await dialog.getByLabel('Email', { exact: false }).fill('new@example.test')
  await dialog.getByLabel('Vehicle plate', { exact: true }).fill('59-B1234')
  await dialog.getByLabel('Identity front', { exact: true }).setInputFiles({ name: 'identity.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=', 'base64') })
  await dialog.getByRole('button', { name: 'Save shipper' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Choose both identity sides')
  expect(state.writes).toHaveLength(0)
  await dialog.getByLabel('Identity back', { exact: true }).setInputFiles({ name: 'identity.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=', 'base64') })
  await dialog.getByRole('button', { name: 'Save shipper' }).click()
  await expect(page.getByRole('table')).toContainText('New Driver')
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0].identityImageUrls).toEqual(['/uploads/mock/identity-1.png', '/uploads/mock/identity-2.png'])
  expect(state.writes[0]).not.toHaveProperty('role')
  expect(state.writes[0]).not.toHaveProperty('password')
})

test('mobile dark layout has no page overflow and guards failed detail reads', async ({ page }) => {
  const state = await setup(page, { dark: true })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/merchant/shippers')
  await expect(page.getByRole('table')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Add shipper', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Save shipper' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Save shipper' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click()
  state.readFail = true
  await rowAction(page, 'View Test Driver')
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit shipper', exact: true })).toHaveCount(0)
})

test('row edit loads fresh data and bulk actions remain honest until backend support', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/shippers')
  await page.getByRole('button', { name: 'Actions for Test Driver', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Delete Test Driver', exact: true })).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByRole('menuitem', { name: 'Lock account Test Driver', exact: true })).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByRole('menuitem', { name: 'Unlock account Test Driver', exact: true })).toHaveAttribute('aria-disabled', 'true')
  await page.keyboard.press('Escape')
  await page.getByRole('checkbox', { name: 'Select Test Driver', exact: true }).check()
  const bar = page.getByRole('region', { name: 'Bulk actions', exact: true })
  await expect(bar).toContainText('1 shippers selected on this page')
  await expect(bar.getByRole('button', { name: 'Delete selected' })).toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click()
  await expect(bar).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Select all shippers on this page' }).check()
  await expect(bar).toBeVisible()
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(bar).toHaveCount(0)
  await rowAction(page, 'Edit Test Driver')
  await expect(page.getByRole('dialog').getByLabel('Full name')).toHaveValue('Test Driver')
  await expect(page.getByRole('dialog').getByLabel('Identity number (optional)')).toHaveAttribute('readonly', '')
  expect(state.writes).toHaveLength(0)
})

test('assignment reuses eligible shippers and verifies the order before submitting', async ({ page }) => {
  await setup(page)
  const orderId = '33333333-3333-4333-8333-333333333333'
  const order = { id: orderId, orderCode: 'WG-ASSIGN', status: 2, paymentStatus: 1, items: [], shipperId: null, lockerName: 'Test Locker' }
  const writes = []
  await page.route('**/api/wash-order/**', async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    if (path.endsWith('/filter')) {
      return route.fulfill({ json: { succeeded: true, total: 1, list: [order] } })
    }
    if (path.endsWith('/available-shippers')) {
      return ok([{ id, fullName: 'Test Driver', phone: '0901234567', vehiclePlate: '59-A1234' }])
    }
    if (path.endsWith('/assign-shipper')) {
      writes.push(req.postDataJSON())
      return ok({ ...order, shipperId: id })
    }
    return ok(order)
  })
  await page.goto('/merchant/shippers')
  await page.getByRole('button', { name: 'Assign orders', exact: true }).click()
  await page.getByRole('button', { name: /WG-ASSIGN/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: 'Test Driver', exact: true }).check()
  await dialog.getByRole('button', { name: 'Confirm update', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(writes).toEqual([{ orderId, shipperId: id, shipperName: 'Test Driver', note: null }])
})


test('team statistics use all-result totals, remain global when filtering and handle failure', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/merchant/shippers')
  const summary = page.getByRole('region', { name: 'Statistics for the entire shipper team', exact: true })
  for (const [label, value] of Object.entries({ 'Total shippers': 25, Working: 20, 'On leave': 5, Available: 12, Busy: 8, Offline: 5 })) {
    await expect(summary.getByRole('heading', { name: label, exact: true }).locator('..')).toContainText(String(value))
  }
  expect(state.summaryCalls).toHaveLength(6)
  await page.getByRole('combobox', { name: 'Work availability' }).click()
  await page.getByRole('option', { name: 'On leave', exact: true }).click()
  await expect(page.getByText('No shippers match your search.')).toBeVisible()
  await expect(summary.getByRole('heading', { name: 'Total shippers', exact: true }).locator('..')).toContainText('25')
  expect(state.summaryCalls).toHaveLength(6)
  state.summaryError = true
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(summary.getByRole('alert')).toBeVisible()
  await expect(summary.getByRole('heading')).toHaveCount(0)
  state.summaryError = false
  await summary.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(summary.getByRole('heading', { name: 'Total shippers', exact: true })).toBeVisible()
})
