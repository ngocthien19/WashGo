import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'
import { expect, test } from '@playwright/test'
import { merchantSession } from './helpers/merchantSession'

const collectId = '11111111-1111-4111-8111-111111111111'
const returnId = '22222222-2222-4222-8222-222222222222'
const cancelledId = '33333333-3333-4333-8333-333333333333'
const shipperId = '44444444-4444-4444-8444-444444444444'
const photo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140"><rect width="200" height="140" fill="#e0e7ff"/><rect x="50" y="20" width="100" height="110" rx="8" fill="#64748b"/></svg>')}`
const makeOrder = (id, type) => ({ id, revision: 1, orderCode: `WG-${type}`, merchantOrderCode: `MC-${type}`, status: type === 1 ? 2 : 9, paymentStatus: type === 1 ? 1 : 2, assignedTaskType: type, nextAction: type, shipperId, shipperAssignedAt: '2026-11-10T01:00:00Z', lockerId: 'deposit-locker', lockerName: 'Deposit Station', lockerLatitude: 10.77, lockerLongitude: 106.69, returnLockerLatitude: 10.8, returnLockerLongitude: 106.7, boxId: 'box-3', boxNumber: '3', returnLockerId: 'return-locker', taskLockerName: type === 1 ? 'Deposit Station' : 'Return Station', taskLockerAddress: '123 Test Street', taskLockerImageUrls: [photo], merchantImageUrls: [photo], merchantEmail: 'store@example.test', merchantPhone: '0909998888', taskBoxNumber: type === 1 ? '3' : null, merchantName: 'Test Store', shipperNote: 'Keep bags sealed', cancelledGoodsStatus: 0, customerName: 'PRIVATE CUSTOMER', shipperTaskPinCode: 'SECRET VALUE', items: [{ id: 'item-1', serviceName: 'Wash service', serviceImageUrls: [photo], quantity: 1 }] })
const asTask = order => ({ taskId: order.id, assignmentVersion: order.id, orderId: order.id, orderCode: order.orderCode, merchantOrderCode: order.merchantOrderCode, taskType: order.assignedTaskType, status: order.nextAction ? 1 : 2, orderStatus: order.status, orderRevision: order.revision, canCollect: order.nextAction === 1, canReturn: order.nextAction === 2, taskLockerName: order.taskLockerName, taskLockerAddress: order.taskLockerAddress, taskLockerImageUrls: order.taskLockerImageUrls, taskLockerLatitude: order.assignedTaskType === 1 ? order.lockerLatitude : order.returnLockerLatitude, taskLockerLongitude: order.assignedTaskType === 1 ? order.lockerLongitude : order.returnLockerLongitude, taskBoxNumber: order.taskBoxNumber, assignedAt: order.shipperAssignedAt, note: order.shipperNote, merchantName: order.merchantName, order: { ...order, merchantPhoneNumber: order.merchantPhone } })
test('Shipper search suggestions use assigned tasks without reading credentials', async ({ page }) => {
  const state = await setup(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/shipper/tasks')
  const input = page.getByRole('search').getByRole('combobox')
  await input.fill('wg-cancelled')
  const option = page.getByRole('option').filter({ hasText: 'WG-CANCELLED' })
  await expect(option).toBeVisible()
  await expect(option.getByText('WG-CANCELLED', { exact: true })).toHaveCSS('font-weight', '700')
  await expect(option).not.toContainText('SECRET VALUE')
  await expect(option).not.toContainText('PRIVATE CUSTOMER')
  await option.click()
  await expect(page).toHaveURL(/keyword=WG-CANCELLED/)
  expect(state.reads).toHaveLength(0)
  expect(state.writes).toHaveLength(0)
})

async function setup(page, options = {}) {
  if (!options.guest) {
    await merchantSession(page, { role: 'Shipper', dark: options.dark })
  }
  const state = { reads: [], writes: [], filters: [], unknown: false, failList: false, details: { [collectId]: makeOrder(collectId, 1), [returnId]: makeOrder(returnId, 2), [cancelledId]: { ...makeOrder(cancelledId, 2), orderCode: 'WG-CANCELLED', status: 99, cancellationFromStatus: 3, cancelledGoodsStatus: 2, paymentStatus: 3 } } }
  await page.route('**/api/**', async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^\/api/, '')
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    const fail = (status, message) => route.fulfill({ status, json: { succeeded: false, message } })
    if (path === '/auth/me') {
      return ok({ id: 'auth-user', fullName: 'Alex Driver', role: 'Shipper', email: 'driver@example.test' })
    }
    if (path === '/shipper-profile') {
      return ok({ revision: 'v1', id: shipperId, fullName: 'Alex Driver', email: 'driver@example.test', vehicleType: 1, status: 2, isActive: true, totalDeliveries: 20, rating: 0 })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return fail(404, '')
    }
    if (path === '/shipper-tasks/summary') {
      const body = request.postDataJSON(); const rows = Object.values(state.details).filter(row => row.nextAction && (!body.keyword || row.orderCode.includes(body.keyword))); return ok({ totalPending: rows.length, collectPending: rows.filter(row => row.assignedTaskType === 1).length, returnPending: rows.filter(row => row.assignedTaskType === 2).length })
    }
    const credentialMatch = path.match(/^\/shipper-tasks\/([^/]+)\/credentials$/)
    if (credentialMatch) {
      const row = state.details[credentialMatch[1]]; return ok({ taskId: row.id, assignmentVersion: row.id, orderRevision: row.revision, pinCode: row.shipperTaskPinCode, qrCode: row.shipperTaskQrString, remainingAttempts: 5, serverNow: '2026-11-12T00:00:00Z' })
    }
    if (path === '/shipper-tasks/filter') {
      const body = request.postDataJSON(); state.filters.push(body)
      expect(body.taskStatus).toBe(1)
      expect(body).not.toHaveProperty('shipperId')
      if (state.failList && body.take > 1) {
        return fail(500, 'List unavailable')
      }
      const rows = Object.values(state.details).filter((row) => row.nextAction != null && (!body.taskType || row.assignedTaskType === body.taskType) && (!body.keyword || row.orderCode.toLowerCase().includes(body.keyword.toLowerCase())))
      return route.fulfill({ json: { succeeded: true, total: rows.length, list: rows.slice((body.page - 1) * body.take, body.page * body.take).map(asTask) } })
    }
    const match = path.match(/^\/(?:wash-order|shipper-tasks)\/([^/]+)(?:\/(shipper-collect|shipper-return))?$/)
    if (match) {
      const order = state.details[match[1]]
      if (!order) {
        return fail(404, 'Task not available')
      }
      if (request.method() === 'GET') {
        state.reads.push(order.id)
        return ok(path.startsWith('/shipper-tasks/') ? asTask(order) : order)
      }
      const body = request.postDataJSON()
      state.writes.push({ path, body })
      expect(Object.keys(body).every((key) => ['pinCode', 'qrCode', 'taskId', 'expectedAssignmentVersion', 'expectedTaskType', 'expectedRevision', 'expectedStatus', 'operationId'].includes(key))).toBe(true)
      if (state.unknown) {
        return fail(503, 'Unknown delivery result')
      }
      if (body.pinCode && body.pinCode !== '123456') {
        return fail(400, 'Invalid task PIN')
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
      order.status = match[2] === 'shipper-collect' ? 3 : order.status === 99 ? 99 : 10
      order.nextAction = null
      order.revision++
      if (match[2] === 'shipper-return') {
        order.returnBoxNumber = '7'; order.cancelledGoodsStatus = order.status === 99 ? 3 : 0
      }
      return ok(order)
    }
    throw new Error(`Unexpected API ${request.method()} ${path}`)
  })
  return state
}
async function openAction(page, id, type) {
  await page.goto(`/shipper/tasks/${id}`)
  await page.getByRole('button', { name: type === 1 ? 'Confirm collection' : 'Confirm return', exact: true }).click()
  return page.getByRole('dialog')
}
async function uploadQr(page, dialog, value) {
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value, size: 256, marginSize: 4, xmlns: 'http://www.w3.org/2000/svg' }))
  const base64 = await page.evaluate(async (source) => {
    const image = new Image()
    image.src = `data:image/svg+xml,${encodeURIComponent(source)}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    canvas.getContext('2d').drawImage(image, 0, 0)
    return canvas.toDataURL('image/png').split(',')[1]
  }, svg)
  await dialog.getByLabel('Upload QR image', { exact: true }).setInputFiles({ name: 'task.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') })
  await expect(dialog.getByRole('status')).toBeVisible()
}
async function fillPin(dialog, pin = '123456') {
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill(pin)
  await dialog.getByRole('checkbox').check()
}

test('task list uses scoped server filters, links, no credentials and preserves its URL', async ({ page }) => {
  await setup(page)
  await page.goto('/shipper/tasks')
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('columnheader', { name: 'Actions', exact: true }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('columnheader', { name: 'Actions', exact: true })).toBeInViewport()
  await expect(page.getByText('SECRET VALUE', { exact: true })).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Delivery type', exact: true }).click()
  await page.getByRole('option', { name: 'Return', exact: true }).click()
  await expect(page).toHaveURL(/taskType=2/)
  await page.getByRole('combobox', { name: 'Search delivery tasks', exact: true }).fill('WG-CANCELLED')
  await page.getByRole('search', { name: 'Search delivery tasks', exact: true }).locator('button').click()
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2)
  await page.reload()
  await expect(page.getByRole('search').getByRole('combobox')).toHaveValue('WG-CANCELLED')
  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'View task', exact: true }).click()
  await expect(page).toHaveURL(`/shipper/tasks/${cancelledId}`)
  await expect(page.locator('main')).not.toContainText('PRIVATE CUSTOMER')
})

test('collection validates PIN, shows BE rejection, then records once after explicit confirmation', async ({ page }) => {
  const state = await setup(page)
  let dialog = await openAction(page, collectId, 1)
  await expect(dialog.getByLabel('PIN digit 1', { exact: true })).toHaveValue('')
  await dialog.getByRole('button', { name: 'Close service details', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  await page.getByRole('button', { name: 'Confirm collection', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert').first()).toBeVisible()
  expect(state.writes).toHaveLength(0)
  await fillPin(dialog, '000000')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(state.writes).toHaveLength(1)
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('123456')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Collection from compartment 3 recorded.', { exact: true }).first()).toBeVisible()
  expect(state.writes).toHaveLength(2)
  await expect(page.getByRole('button', { name: 'Confirm collection', exact: true })).toHaveCount(0)
})

test('return QR rejects mismatched tasks locally and shows the server allocated box', async ({ page }) => {
  const state = await setup(page)
  const dialog = await openAction(page, returnId, 2)
  await expect(dialog.getByText('Return Station', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'QR', exact: true }).click()
  await expect(dialog.getByRole('textbox')).toHaveCount(0)
  await uploadQr(page, dialog, 'WASHGO:COLLECT:WG-2:123456')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('QR')
  expect(state.writes).toHaveLength(0)
  await uploadQr(page, dialog, 'WASHGO:RETURN:WG-2:123456')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Return to compartment 7 recorded.', { exact: true }).first()).toBeVisible()
  expect(state.writes[0].body).toEqual({ qrCode: 'WASHGO:RETURN:WG-2:123456', taskId: returnId, expectedAssignmentVersion: returnId, expectedRevision: 1, expectedTaskType: 2, expectedStatus: 9, operationId: expect.any(String) })
})

test('changed assignment prevents a write using a stale task snapshot', async ({ page }) => {
  const state = await setup(page)
  const dialog = await openAction(page, collectId, 1)
  await fillPin(dialog)
  state.details[collectId].revision++
  state.details[collectId].shipperId = 'another-shipper'
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('changed')
  expect(state.writes).toHaveLength(0)
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
})

test('unknown mutation result stays blocked after closing the modal and does not retry', async ({ page }) => {
  const state = await setup(page)
  state.unknown = true
  const dialog = await openAction(page, collectId, 1)
  await fillPin(dialog)
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('unknown')
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirm collection', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Check result', exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(1)
})

test('cancelled goods can be returned without pretending the cancelled order is completed', async ({ page }) => {
  const state = await setup(page)
  const dialog = await openAction(page, cancelledId, 2)
  await fillPin(dialog)
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.details[cancelledId].status).toBe(99)
  expect(state.details[cancelledId].cancelledGoodsStatus).toBe(3)
  await expect(page.getByText('Return to compartment 7 recorded.', { exact: true }).first()).toBeVisible()
})

test('mobile list retry, missing detail and guest protection remain safe', async ({ page }) => {
  const state = await setup(page, { dark: true })
  state.failList = true
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/shipper/tasks')
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
  state.failList = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto('/shipper/tasks/99999999-9999-4999-8999-999999999999')
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm collection', exact: true })).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})

test('guests cannot load or perform delivery tasks', async ({ page }) => {
  const state = await setup(page, { guest: true })
  await page.goto(`/shipper/tasks/${collectId}`)
  await expect(page).toHaveURL('/login')
  expect(state.writes).toHaveLength(0)
  expect(state.filters).toHaveLength(0)
})

test('rapid confirmation clicks do not submit collection twice', async ({ page }) => {
  const state = await setup(page)
  const dialog = await openAction(page, collectId, 1)
  await fillPin(dialog)
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).evaluate((button) => {
    button.click(); button.click()
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
})

test('assigned shipper can reveal the task PIN and QR on demand without submitting or prefilling them', async ({ page }) => {
  const state = await setup(page)
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => {
    window.copiedTaskPin = value
  } } }))
  state.details[collectId].shipperTaskPinCode = '123456'
  state.details[collectId].shipperTaskQrString = 'WASHGO:COLLECT:WG-1:123456'
  await page.goto(`/shipper/tasks/${collectId}`)
  await expect(page.locator('main').getByText('123456', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Show QR code', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Task QR code', exact: true })).toHaveCount(1)
  await expect(page.locator('main').getByText('123456', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Hide QR code', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Task QR code', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Copy PIN', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.copiedTaskPin)).toBe('123456')
  await expect(page.locator('main').getByText('123456', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Show task credential', exact: true }).click()
  await expect(page.locator('main').getByText('123456', { exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(0)
  await page.getByRole('button', { name: 'Hide task credential', exact: true }).click()
  await expect(page.locator('main').getByText('123456', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirm collection', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('PIN digit 1', { exact: true })).toHaveValue('')
  expect(state.writes).toHaveLength(0)
})


test('task media and merchant contacts display with a six-slot PIN dialog and matched action header', async ({ page }) => {
  const state = await setup(page)
  await page.setViewportSize({ width: 1440, height: 1050 })
  await page.goto('/shipper/tasks')
  await expect(page.getByRole('table').getByAltText('Deposit Station')).toBeVisible()
  const headers = page.getByRole('columnheader')
  expect(await headers.first().evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(await headers.last().evaluate((node) => getComputedStyle(node).backgroundColor))
  await page.goto(`/shipper/tasks/${collectId}`)
  await expect(page.getByAltText('Deposit Station')).toBeVisible()
  await expect(page.getByAltText('Wash service')).toBeVisible()
  await expect(page.getByAltText('Test Store')).toBeVisible()
  await expect(page.getByText('store@example.test', { exact: true })).toBeVisible()
  await expect(page.getByText('0909998888', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Confirm collection', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByAltText('Deposit Station')).toBeVisible()
  await expect(dialog.locator('input[type="password"]')).toHaveCount(6)
  await dialog.getByLabel('PIN digit 1', { exact: true }).fill('123456')
  for (let index = 1; index <= 6; index++) {
    await expect(dialog.getByLabel(`PIN digit ${index}`, { exact: true })).toHaveValue(String(index))
  }
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(dialog.getByLabel('PIN digit 6', { exact: true })).toBeInViewport()
  await dialog.getByRole('button', { name: 'QR', exact: true }).click()
  await expect(dialog.getByText('Task QR code', { exact: true })).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})


test('list menu confirms collection in place and refreshes the pending list', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/shipper/tasks')
  const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'WG-1', exact: true }) })
  await expect(row.getByText('123 Test Street', { exact: true })).toBeVisible()
  expect(state.reads).toHaveLength(0)
  await row.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Confirm collection', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Confirm collection', exact: true })).toBeVisible()
  expect(state.reads).toHaveLength(1)
  expect(state.writes).toHaveLength(0)
  await fillPin(dialog)
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(row).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
  await expect(page).toHaveURL('/shipper/tasks')
})

test('list quick confirmation checks current assignment and blocks retry after an unknown write', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/shipper/tasks')
  const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'WG-1', exact: true }) })
  await expect(row).toBeVisible()
  state.details[collectId].shipperId = 'another-shipper'
  await row.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Confirm collection', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  expect(state.writes).toHaveLength(0)
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  state.details[collectId].shipperId = shipperId
  state.unknown = true
  await row.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Confirm collection', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await fillPin(dialog)
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await row.getByRole('button', { name: 'Actions', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Check result', exact: true })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Confirm collection', exact: true })).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
})

test('map opens inside a shared dialog for list and detail with the correct destination', async ({ page }) => {
  const state = await setup(page)
  await page.route('https://tile.openstreetmap.de/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCGsAAAAASUVORK5CYII=', 'base64') }))
  await page.goto('/shipper/tasks')
  const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'WG-2', exact: true }) })
  await expect(row.getByRole('button', { name: 'View map', exact: true })).toHaveCSS('font-size', '14px')
  await row.getByRole('button', { name: 'View map', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Locker location map', exact: true })).toBeVisible()
  await expect(dialog.locator('.leaflet-container')).toBeVisible({ timeout: 15000 })
  await expect(dialog.getByRole('link', { name: 'Open Google Maps', exact: true }).last()).toHaveAttribute('href', /query=10.8%2C106.7/)
  expect(page.context().pages()).toHaveLength(1)
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.goto(`/shipper/tasks/${collectId}`)
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toHaveCSS('font-size', '16px')
  await page.getByRole('button', { name: 'View map', exact: true }).click()
  await expect(dialog.getByRole('link', { name: 'Open Google Maps', exact: true }).last()).toHaveAttribute('href', /query=10.77%2C106.69/)
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  state.details[collectId].lockerLatitude = null
  state.details[collectId].lockerLongitude = null
  await page.getByRole('button', { name: 'View map', exact: true }).click()
  await expect(dialog.locator('.leaflet-container')).toHaveCount(0)
  await expect(dialog.getByRole('link', { name: 'Open Google Maps', exact: true })).toHaveAttribute('href', /123%20Test%20Street/)
  expect(page.context().pages()).toHaveLength(1)
})


test('map shows requested current location, straight-line kilometers and external driving directions', async ({ page, context }) => {
  await setup(page)
  await context.grantPermissions(['geolocation'], { origin: 'http://localhost:5180' })
  await context.setGeolocation({ latitude: 10.76, longitude: 106.68 })
  await page.route('https://tile.openstreetmap.de/**', (route) => route.abort())
  await page.goto(`/shipper/tasks/${returnId}`)
  await page.getByRole('button', { name: 'View map', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('link', { name: 'Directions on Google Maps', exact: true })).toHaveAttribute('href', /destination=10.8%2C106.7&travelmode=driving/)
  await dialog.getByRole('button', { name: 'Use my location', exact: true }).click()
  await expect(dialog.getByText(/About .* km away in a straight line/)).toBeVisible()
  await expect(dialog.getByText('Your location', { exact: true })).toBeVisible({ timeout: 15000 })
  await expect(dialog.getByRole('link', { name: 'Directions on Google Maps', exact: true })).toHaveAttribute('href', /origin=10.76%2C106.68/)
  await expect(dialog.getByRole('link', { name: 'Directions on Google Maps', exact: true })).toHaveCSS('font-size', '16px')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(dialog.getByRole('link', { name: 'Directions on Google Maps', exact: true })).toBeInViewport()
  expect(context.pages()).toHaveLength(1)
})

test('denied location leaves the locker map and directions usable without a fake distance', async ({ page }) => {
  await setup(page)
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success, error) => {
    window.locationRequests = (window.locationRequests || 0) + 1; error({ code: 1 })
  } } }))
  await page.route('https://tile.openstreetmap.de/**', (route) => route.abort())
  await page.goto(`/shipper/tasks/${collectId}`)
  await page.getByRole('button', { name: 'View map', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Use my location', exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.locationRequests || 0)).toBe(0)
  await dialog.getByRole('button', { name: 'Use my location', exact: true }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByText(/About .* km away in a straight line/)).toHaveCount(0)
  await expect(dialog.getByRole('link', { name: 'Directions on Google Maps', exact: true })).toHaveAttribute('href', /destination=10.77%2C106.69&travelmode=driving/)
  expect(await page.evaluate(() => window.locationRequests)).toBe(1)
})
