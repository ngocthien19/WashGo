import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'

const orderId = '10000000-0000-4000-8000-000000000001', taskId = '20000000-0000-4000-8000-000000000001', lockerId = '30000000-0000-4000-8000-000000000001'
const photo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="blue"/></svg>')}`
async function setup(page, role, options = {}) {
  await merchantSession(page, { role, dark: options.dark })
  const state = {
    writes: [], queries: [], taskType: 3, unknown: false, recover: false, conflict: false,
    profile: { id: 'shipper-domain', fullName: 'Driver Example', email: 'driver@example.test', vehicleType: 1, status: 1, isActive: true, totalDeliveries: 0, revision: 'profile-v1', canChangeWorkStatus: true, canGoOffline: true },
    cycle: { id: 'cycle-1', orderId, orderCode: 'WG-STORAGE', orderRevision: 7, state: 3, basis: 'Workflow', taskId, shopAddress: 'INTERNAL SHOP ADDRESS', receiptReference: 'INTERNAL RECEIPT', exceptionNote: 'INTERNAL EXCEPTION', feeTotal: 100000, feePaid: 20000, outstanding: 80000, canAssign: role !== 'Customer', canCancelAssignment: false, canRequestReturn: role === 'Customer', canCancelReturn: false },
    order: { id: orderId, revision: 7, storageWorkflowVersion: 1, status: 13, orderCode: 'WG-STORAGE', createdOn: 1794391200, paymentStatus: 2, paymentMethod: 2, finalAmount: 80000, totalAmount: 80000, discountAmount: 0, weightSurchargeAmount: 0, overdueFeeTotal: 100000, storageFeeTotal: 20000, lockerName: 'Test locker', items: [], timeline: [] }
  }
  const task = () => ({ taskId, orderId, orderCode: 'WG-STORAGE', orderRevision: state.cycle.orderRevision, status: 1, taskType: state.taskType, orderStatus: state.taskType === 3 ? 14 : 15, assignmentVersion: taskId, canCollect: false, canReturn: false, canStorageDepart: !!state.cycle.canDepart, canStoragePlace: !!state.cycle.canPlace, canStorageCollect: !!state.cycle.canCollect, canStorageHandover: !!state.cycle.canHandover, taskLockerName: 'Test locker', taskLockerAddress: 'Public locker address', storageShopAddress: 'INTERNAL SHOP ADDRESS', order: { shipperId: state.profile.id, items: [] } })
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/api/, '')
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    const missing = () => route.fulfill({ status: 404, json: { succeeded: false } })
    const paged = list => route.fulfill({ json: { succeeded: true, list, total: list.length, currentPage: 1, totalPages: 1 } })
    if (path === '/auth/me') {
      return ok({ id: 'merchant-test', fullName: 'Example', role, email: 'example@example.test' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/')) {
      return missing()
    }
    if (path === '/policy/customer') {
      return ok({ terms: { version: 'v1', content: 'Terms' }, rules: {}, accepted: true, requiresAcceptance: false })
    }
    if (path === '/shipper-profile/work-status') {
      const body = request.postDataJSON(); state.writes.push({ path, body }); state.profile = { ...state.profile, status: body.status, revision: 'profile-v2' }; return ok(state.profile)
    }
    if (path === '/shipper-profile') {
      return ok(state.profile)
    }
    if (path === '/storage/summary') {
      return ok({ MovedToStorage: 1 })
    }
    if (path === '/storage/filter') {
      state.queries.push(request.postDataJSON()); return paged([state.cycle])
    }
    if (path === `/storage/${orderId}/cycles`) {
      return paged([state.cycle])
    }
    if (path === `/storage/${orderId}/shippers`) {
      return ok([{ id: 'shipper-domain', fullName: 'Driver Example', phone: '0901234567' }])
    }
    if (path === `/storage/${orderId}/quote`) {
      return ok({ orderId, lockerId: url.searchParams.get('lockerId'), feeTotal: 100000, outstanding: 80000, quoteToken: 'server-quote', expiresAt: '2099-01-01T00:00:00Z' })
    }
    if (path.startsWith(`/storage/${orderId}/operations/`)) {
      return state.recover ? ok(state.cycle) : missing()
    }
    if (path.startsWith(`/storage/${orderId}/`) && request.method() === 'POST') {
      const body = request.postDataJSON(); state.writes.push({ path, body })
      if (state.conflict) {
        return route.fulfill({ status: 409, json: { succeeded: false, meta: { code: 'RevisionMismatch' } } })
      }
      if (state.unknown) {
        return route.fulfill({ status: 503, json: { succeeded: false } })
      }
      state.cycle.orderRevision++
      if (path.endsWith('/return-request')) {
        Object.assign(state.cycle, { canCancelReturn: true, returnState: 1, returnLockerId: lockerId })
      }
      if (path.endsWith('/cancel-return')) {
        Object.assign(state.cycle, { canCancelReturn: false, returnState: 5 })
      }
      if (path.endsWith('/collect')) {
        Object.assign(state.cycle, { state: 2, canCollect: false, canHandover: true })
      }
      if (path.endsWith('/depart')) {
        Object.assign(state.cycle, { state: 4, canDepart: false, canPlace: true })
      }
      if (path.endsWith('/place')) {
        Object.assign(state.cycle, { state: 5, canPlace: false })
      }
      if (path.endsWith('/handover')) {
        Object.assign(state.cycle, { state: 3, canHandover: false, receiptReference: body.receiptReference })
      }
      return ok(state.cycle)
    }
    if (path === `/customer/lockers/${lockerId}`) {
      return ok({ id: lockerId, name: 'Return Locker', address: 'Public Paris Street', imageUrls: [photo] })
    }
    if (path === '/customer/lockers') {
      return paged([{ id: lockerId, name: 'Return Locker', address: 'Public Paris Street', imageUrls: [photo] }])
    }
    if (path === `/wash-order/${orderId}`) {
      return ok(state.order)
    }
    if (path === `/rating/order/${orderId}`) {
      return ok(null)
    }
    if (path === `/shipper-tasks/${taskId}`) {
      return ok(task())
    }
    if (path === `/shipper-tasks/${taskId}/credentials`) {
      return ok({ taskId, assignmentVersion: taskId, orderRevision: state.cycle.orderRevision, pinCode: '123456', qrCode: `WASHGO:StorageTransfer:WG-STORAGE:${taskId}:123456` })
    }
    return missing()
  })
  return state
}

for (const role of ['Admin', 'Merchant']) {
  test(`${role} assigns only listed Shippers with revision and explicit confirmation`, async ({ page }) => {
    const state = await setup(page, role, { dark: true })
    state.cycle.state = 1
    await page.goto(`/${role.toLowerCase()}/storage`)
    await page.getByRole('button', { name: 'Assign Shipper', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('combobox', { name: 'Assigned Shipper' }).click()
    await page.getByRole('option', { name: /Driver Example/ }).click()
    if (role === 'Admin') {
      await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Support merchant dispatch')
    }
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Assign Shipper', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    expect(state.writes).toHaveLength(1)
    expect(state.writes[0].body).toMatchObject({ expectedRevision: 7, shipperId: 'shipper-domain', operationId: expect.any(String) })
    expect(state.writes[0].body).not.toHaveProperty('merchantId')
  })
}

test('unknown storage assignment survives closing and only checks the original operation', async ({ page }) => {
  const state = await setup(page, 'Merchant'); state.unknown = true
  await page.goto('/merchant/storage')
  await page.getByRole('button', { name: 'Assign Shipper', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('combobox', { name: 'Assigned Shipper' }).click()
  await page.getByRole('option', { name: /Driver Example/ }).click()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Assign Shipper', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Replay the same request' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Check result', exact: true }).click()
  dialog = page.getByRole('dialog'); state.recover = true
  await dialog.getByRole('button', { name: 'Check result', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes).toHaveLength(1)
})

test('Customer accepts a quote for locker redelivery without seeing internal custody information', async ({ page }) => {
  const state = await setup(page, 'Customer')
  await page.goto(`/customer/orders/${orderId}`)
  await expect(page.getByText('INTERNAL SHOP ADDRESS')).toHaveCount(0)
  await expect(page.getByText('INTERNAL RECEIPT')).toHaveCount(0)
  await expect(page.getByText('INTERNAL EXCEPTION')).toHaveCount(0)
  await page.getByRole('button', { name: 'Choose a return locker / Refresh quote' }).click()
  await page.getByRole('button', { name: /Return Locker Public Paris Street/ }).click()
  await page.getByRole('button', { name: 'Get quote', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm redelivery request', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm redelivery request', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes[0]).toMatchObject({ path: `/storage/${orderId}/return-request`, body: { quoteToken: 'server-quote', expectedRevision: 7 } })
  expect(Object.keys(state.writes[0].body).sort()).toEqual(['expectedRevision', 'operationId', 'quoteToken'])
  await page.getByRole('button', { name: 'Cancel redelivery request', exact: true }).click()
  await page.getByRole('dialog').getByRole('checkbox').check()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel redelivery request', exact: true }).click()
  await expect.poll(() => state.writes.length).toBe(2)
  expect(state.writes[1].path).toBe(`/storage/${orderId}/cancel-return`)
})

test('Shipper confirms collection and a separate shop handover using task credentials', async ({ page }) => {
  const state = await setup(page, 'Shipper')
  Object.assign(state.cycle, { state: 1, canAssign: false, canCollect: true })
  await page.goto(`/shipper/tasks/${taskId}`)
  await page.getByRole('button', { name: 'Confirm collection from locker', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('PIN', { exact: true }).fill('123456')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm collection from locker', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes[0].body).toMatchObject({ taskId, pinCode: '123456', expectedRevision: 7 })
  await page.getByRole('button', { name: 'Confirm shop handover', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('PIN', { exact: true }).fill('123456')
  await dialog.getByRole('textbox', { name: 'Handover receipt' }).fill('RECEIPT-01')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm shop handover', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes[1].body).toMatchObject({ taskId, expectedRevision: 8, receiptReference: 'RECEIPT-01' })
  expect(state.writes.every(write => !write.path.includes('shipper-return') && !write.path.includes('shipper-collect'))).toBe(true)
})

test('Shipper self-status requires confirmation and uses the dedicated guarded endpoint', async ({ page }) => {
  const state = await setup(page, 'Shipper')
  await page.goto('/shipper/profile')
  await page.getByRole('button', { name: 'Go offline', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Go offline', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ path: '/shipper-profile/work-status', body: { status: 3, expectedRevision: 'profile-v1', operationId: expect.any(String) } })
  await expect(page.getByRole('button', { name: 'Go available', exact: true })).toBeVisible()
})

test('storage return keeps custody on a placement conflict and requires fresh confirmation to try again', async ({ page }) => {
  const state = await setup(page, 'Shipper'); state.taskType = 4
  Object.assign(state.cycle, { state: 3, canAssign: false, canDepart: true })
  await page.goto(`/shipper/tasks/${taskId}`)
  await page.getByRole('button', { name: 'Confirm dispatch for redelivery', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('PIN', { exact: true }).fill('123456')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm dispatch for redelivery', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  state.conflict = true
  await page.getByRole('button', { name: 'Confirm placement in locker', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('PIN', { exact: true }).fill('123456')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm placement in locker', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Confirm placement in locker', exact: true })).toBeDisabled()
  expect(state.cycle.state).toBe(4)
  expect(state.writes).toHaveLength(2)
  await dialog.getByRole('button', { name: 'Close and reload', exact: true }).click()
  state.conflict = false
  await page.getByRole('button', { name: 'Confirm placement in locker', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('PIN', { exact: true }).fill('123456')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm placement in locker', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.cycle.state).toBe(5)
  expect(state.writes[2].body.operationId).not.toBe(state.writes[1].body.operationId)
})

test('Shipper cannot go offline when an active task blocks it', async ({ page }) => {
  const state = await setup(page, 'Shipper')
  state.profile.canGoOffline = false
  state.profile.goOfflineBlockedReason = 'ActiveDelivery'
  await page.goto('/shipper/profile')
  await expect(page.getByRole('button', { name: 'Go offline', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
})

test('Admin legacy adoption requires proof and reason without a fabricated Shipper handover', async ({ page }) => {
  const state = await setup(page, 'Admin')
  state.order.storageWorkflowVersion = 0
  state.cycle.canAssign = false
  await page.goto(`/admin/orders/${orderId}`)
  await page.getByRole('button', { name: 'Verify older stored order', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Verified custody with the registered shop')
  await dialog.getByRole('textbox', { name: 'Verification reference', exact: true }).fill('VERIFICATION-01')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Verify older stored order', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes[0]).toMatchObject({ path: `/storage/${orderId}/verify-legacy`, body: { expectedRevision: 7, reason: 'Verified custody with the registered shop', confirmedAtCurrentShop: true, verificationReference: 'VERIFICATION-01' } })
  expect(state.writes[0].body).not.toHaveProperty('taskId')
  expect(state.writes[0].body).not.toHaveProperty('intakeAt')
})

test('Merchant reports an in-transit exception without changing custody or cancelling the task', async ({ page }) => {
  const state = await setup(page, 'Merchant')
  Object.assign(state.cycle, { state: 2, canAssign: false, canCancelAssignment: false })
  await page.goto('/merchant/storage')
  await expect(page.getByRole('button', { name: 'Assign Shipper', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cancel assignment', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Report an exception', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Unable to complete handover; requesting coordination')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Report an exception', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes[0].path).toBe(`/storage/${orderId}/exception`)
  expect(state.cycle.state).toBe(2)
  expect(state.cycle.taskId).toBe(taskId)
})

test('Customer can read closed storage history after redelivery without requesting another trip', async ({ page }) => {
  const state = await setup(page, 'Customer')
  state.order.status = 10
  Object.assign(state.cycle, { state: 5, canRequestReturn: false, canCancelReturn: false, returnState: 4, frozenLockerFee: 20000, frozenWarehouseFee: 80000 })
  await page.goto(`/customer/orders/${orderId}`)
  await page.getByRole('button', { name: 'Storage and redelivery history', exact: true }).click()
  await expect(page.getByText('Frozen storage fees for this cycle', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm redelivery request', exact: true })).toHaveCount(0)
  await expect(page.getByText('INTERNAL SHOP ADDRESS')).toHaveCount(0)
  expect(state.writes).toHaveLength(0)
})
