import { test, expect } from '@playwright/test'
import { merchantSession } from './helpers/merchantSession'
import { taskDto, securityRoutes } from './helpers/shipperContracts'
const taskId = '11111111-1111-4111-8111-111111111111', orderId = '22222222-2222-4222-8222-222222222222', shipperId = '33333333-3333-4333-8333-333333333333', eventId = '44444444-4444-4444-8444-444444444444'
async function setup(page) {
  await merchantSession(page, { role: 'Shipper' })
  const order = { taskId, id: orderId, shipperId, orderCode: 'WG-SYNC-1', merchantOrderCode: 'MC-SYNC', assignedTaskType: 1, nextAction: 1, status: 2, paymentStatus: 1, revision: 7, taskLockerName: 'Task Station', taskLockerAddress: 'Assigned locker address', taskBoxNumber: '3', shipperAssignedAt: '2026-11-12T01:00:00Z', items: [{ serviceName: 'Laundry', quantity: 1 }] }
  const event = { eventId, taskId, orderId, orderCode: 'WG-OLD', taskType: 2, lockerName: 'Historical Station', lockerAddress: 'Historical address', boxNumber: '9', completedAt: '2026-11-11T05:00:00Z', assignedAt: '2026-11-11T01:00:00Z', orderStatus: 12, eventStatus: 10, snapshotSource: 'CapturedAtCompletion' }
  const state = { writes: [], reads: [], unknown: false, lookupReady: false, queries: [] }
  await page.route('**/api/**', async route => {
    if (await securityRoutes(route)) {
      return
    }
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, '')
    state.reads.push(path)
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    if (path === '/auth/me') {
      return ok({ id: 'auth-user', fullName: 'Alex Driver', role: 'Shipper', email: 'driver@example.test' })
    }
    if (path === '/shipper-profile') {
      return ok({ id: shipperId, revision: 'profile-v1', fullName: 'Alex Driver', email: 'driver@example.test', vehicleType: 1, status: 1, isActive: true, totalDeliveries: 8 })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/')) {
      return route.fulfill({ status: 404, json: {} })
    }
    if (path === `/shipper-tasks/${orderId}`) {
      return route.fulfill({ status: 404, json: { succeeded: false } })
    }
    if (path === `/wash-order/${orderId}` && req.method() === 'GET') {
      return ok(order)
    }
    if (path === '/shipper-tasks/filter') {
      state.queries.push(req.postDataJSON()); return route.fulfill({ json: { succeeded: true, total: 1, list: [taskDto(order)] } })
    }
    if (path === `/shipper-tasks/${taskId}`) {
      return ok(taskDto(order))
    }
    if (path === `/shipper-tasks/${taskId}/credentials`) {
      return ok({ taskId, assignmentVersion: taskId, orderRevision: 7, pinCode: '123456', qrCode: 'WASHGO:COLLECT:WG-SYNC-1:123456', remainingAttempts: 5, serverNow: '2026-11-12T01:00:00Z' })
    }
    if (path.includes(`/shipper-tasks/${taskId}/operations/`)) {
      return ok({ taskId, operationId: path.split('/').at(-1), state: state.lookupReady ? 'succeeded' : 'unknown', result: state.lookupReady ? { id: orderId, shipperId, status: 3, assignedTaskType: 1 } : null })
    }
    if (path === `/wash-order/${orderId}/shipper-collect`) {
      state.writes.push(req.postDataJSON())
      if (state.unknown) {
        return route.fulfill({ status: 503, json: { succeeded: false } })
      }
      order.nextAction = null; order.status = 3; order.revision++
      return ok(order)
    }
    if (path === '/shipper-delivery/history') {
      state.queries.push(req.postDataJSON()); return route.fulfill({ json: { succeeded: true, total: 30, list: [event], currentPage: 1, pageSize: 12 } })
    }
    if (path === '/shipper-delivery/summary') {
      return ok({ total: 30, collectCount: 10, returnCount: 20 })
    }
    if (path === '/shipper-delivery/lockers/filter') {
      return ok([{ id: taskId, name: 'Historical Station' }])
    }
    if (path === `/shipper-delivery/history/${eventId}`) {
      return ok(event)
    }
    if (path === '/shipper-delivery/export') {
      state.export = req.postDataJSON(); return route.fulfill({ contentType: 'text/csv; charset=utf-8', body: 'EventId,OrderCode\n' + eventId + ',WG-OLD\n' })
    }
    throw new Error(`Unexpected Shipper request ${req.method()} ${path}`)
  })
  return state
}
test('distinct task and order IDs govern credentials and the guarded delivery write', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/shipper/tasks/${taskId}`)
  await expect(page.getByText('Assigned locker address', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Show task credential', exact: true }).click()
  await expect(page.getByText('123456', { exact: true })).toBeVisible()
  expect(state.reads).toContain(`/shipper-tasks/${taskId}/credentials`)
  expect(state.reads).not.toContain(`/wash-order/${taskId}`)
  await page.getByRole('button', { name: 'Confirm collection', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('PIN digit 1', { exact: true })).toHaveValue('')
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('123456')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ taskId, expectedAssignmentVersion: taskId, expectedRevision: 7, expectedStatus: 2, expectedTaskType: 1, pinCode: '123456', operationId: expect.any(String) })
})
test('unknown delivery survives dialog reopen and lookup never resends the POST', async ({ page }) => {
  const state = await setup(page); state.unknown = true
  await page.goto(`/shipper/tasks/${taskId}`)
  await page.getByRole('button', { name: 'Confirm collection', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('123456')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Check result', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Check result', exact: true }).click()
  expect(state.writes).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  state.lookupReady = true
  await page.getByRole('button', { name: 'Check result', exact: true }).click()
  await expect(page.getByText('Collection from compartment 3 recorded.', { exact: true }).first()).toBeVisible()
  expect(state.writes).toHaveLength(1)
})
test('history uses event detail and scoped export without reading current order details', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/shipper/history')
  await expect(page.getByRole('table')).toContainText('WG-OLD')
  await page.getByRole('search').getByRole('combobox').fill('wg-old')
  await page.getByRole('search').getByRole('combobox').press('Enter')
  await expect.poll(() => state.queries.at(-1)?.keyword).toBe('wg-old')
  await page.getByRole('button', { name: 'Delivery event details', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Historical address')
  await expect(dialog).toContainText('Information captured at completion.')
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click()
  await download
  expect(state.export.keyword).toBe('wg-old')
  expect(state.reads.some(path => path.startsWith('/wash-order/'))).toBe(false)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('legacy order notification resolves the current assignment without substituting orderId for taskId', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/shipper/tasks/${orderId}`)
  await expect(page.getByRole('button', { name: 'Confirm collection', exact: true })).toBeVisible()
  expect(state.reads).toContain(`/shipper-tasks/${taskId}`)
  expect(state.queries[0]).toMatchObject({ keyword: 'WG-SYNC-1', taskStatus: 1 })
  expect(state.writes).toHaveLength(0)
})
