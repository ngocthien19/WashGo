import { expect, test } from '@playwright/test'
import { setupAdminOrders } from '../helpers/adminOrderSession'
import { merchantSession } from '../helpers/merchantSession'

const id = (index) => `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`
const pageRows = (body, make) => Array.from({ length: body.take }, (_, index) => make((body.page - 1) * body.take + index))

async function setupResults(page, role) {
  if (role === 'Admin') {
    const state = await setupAdminOrders(page, { merchant: true })
    const original = state.orders[0]
    state.orders = Array.from({ length: 36 }, (_, index) => ({ ...original, id: id(index), orderCode: `WG-ADMIN-${String(index + 1).padStart(2, '0')}` }))
    await page.route('**/api/wash-order/filter', async (route) => {
      if (route.request().postDataJSON().page === 2) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      await route.fallback()
    })
    return '/admin/orders'
  }
  await merchantSession(page, { role })
  await page.route('**/api/**', async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^\/api/, '')
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', fullName: 'Pagination fixture', role })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === '/policy/customer') {
      return ok({ terms: { version: 'fixture', content: 'Terms' }, rules: {}, requiresAcceptance: false })
    }
    if (path === '/merchant-profile') {
      return ok({ id: 'merchant-test', businessName: 'Test Store', status: 1 })
    }
    if (path === '/shipper-profile') {
      return ok({ id: 'shipper-1', revision: 'v1', fullName: 'Pagination fixture', email: 'driver@example.test', vehicleType: 1, status: 1, isActive: true, totalDeliveries: 36 })
    }
    if (path === '/locker/summary') {
      return ok({ totalLockers: 36, activeLockers: 36, maintenanceLockers: 0, inactiveLockers: 0, totalBoxes: 72, availableBoxes: 36, occupiedBoxes: 36, reservedBoxes: 0, maintenanceBoxes: 0 })
    }
    if (path === '/shipper-delivery/summary') {
      return ok({ total: 36, collectCount: 18, returnCount: 18 })
    }
    if (path === '/shipper-delivery/lockers/filter') {
      return ok([])
    }
    if (['/locker/filter', '/shipper-delivery/history', '/incident/mine/filter'].includes(path)) {
      const body = request.postDataJSON()
      if (body.page === 2) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      const make = path === '/locker/filter' ? (index) => ({
        id: id(index), code: `LK-${index + 1}`, name: `Station ${index + 1}`, address: '123 Test Street', city: 'Test City', status: 1, lockerType: 1,
        totalBoxes: 2, availableBoxes: 1, emptyBoxesCount: 1, latitude: 10.77, longitude: 106.69, imageUrls: []
      }) : path === '/shipper-delivery/history' ? (index) => ({
        eventId: id(index), taskId: `task-${index}`, orderId: `order-${index}`, orderCode: `WG-HISTORY-${index + 1}`,
        taskType: 1, lockerName: 'Test Station', lockerAddress: '123 Test Street', boxNumber: String(index + 1),
        completedAt: '2026-11-09T12:00:00Z', orderStatus: 12
      }) : (index) => ({
        id: id(index), orderId: id(index + 100), orderCode: `WG-COMPLAINT-${index + 1}`, status: 1, type: 1, severity: 1,
        description: 'Fixture complaint', imageUrls: [], videoUrls: [], compensationAmount: 0, createdOn: 1794268800
      })
      return route.fulfill({ json: { succeeded: true, total: 36, currentPage: body.page, list: pageRows(body, make) } })
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return { Merchant: '/merchant/lockers', Shipper: '/shipper/history', Customer: '/complaints' }[role]
}

for (const role of ['Admin', 'Merchant', 'Shipper', 'Customer']) {
  test(`${role} pagination scroll returns to its table header after the next page finishes loading`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    const path = await setupResults(page, role)
    await page.goto(path)
    const rowCount = role === 'Customer' ? 7 : 13
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(rowCount, { timeout: 15000 })
    const next = page.getByRole('button', { name: 'Next page', exact: true })
    await next.scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
    await next.click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(rowCount)
    const header = page.getByRole('table').locator('thead')
    const offset = role === 'Customer' ? 112 : 96
    await expect.poll(async () => Math.abs((await header.boundingBox()).y - offset)).toBeLessThanOrEqual(1)
    // Going back uses the same behavior; reloading an existing URL must not.
    const previous = page.getByRole('button', { name: 'Previous page', exact: true })
    await previous.scrollIntoViewIfNeeded()
    await previous.click()
    await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect.poll(async () => Math.abs((await header.boundingBox()).y - offset)).toBeLessThanOrEqual(1)
  })
}
