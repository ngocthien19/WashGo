import { adminUpgradeMocks } from './adminUpgradeMocks'
import { merchantSession } from './merchantSession.js'
import { mockOrderActions, mockStatusCounts } from './merchantOrderData.js'

export const orderId = '11111111-1111-4111-8111-111111111111'
export const merchantId = '22222222-2222-4222-8222-222222222222'
export const lockerId = '33333333-3333-4333-8333-333333333333'
export const shipperId = '44444444-4444-4444-8444-444444444444'
export const serviceId = '55555555-5555-4555-8555-555555555555'
export async function setupAdminOrders(page, options = {}) {
  await merchantSession(page, { role: 'Admin', dark: options.dark })
  await page.route('**/mock/*.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCGsAAAAASUVORK5CYII=', 'base64') }))
  const make = i => ({ id: i === 0 ? orderId : `11111111-1111-4111-8111-${String(i + 1).padStart(12, '0')}`, orderCode: `WG-ADMIN-${String(i + 1).padStart(2, '0')}`, revision: 1, status: options.status || 2, paymentStatus: 1, merchantId: options.merchant ? merchantId : null, merchantName: options.merchant ? 'Test Laundry' : null, customerName: 'Test Customer', customerPhoneNumber: '0901234567', lockerId, lockerName: 'Test Locker', lockerAddress: '123 Test Street', boxNumber: '3', serviceNames: ['Wash'], items: [{ id: 'item', serviceName: 'Wash', quantity: 1, unitPrice: 50000, subTotal: 50000 }], actualWeightKg: 5, totalAmount: 50000, finalAmount: 50000, discountAmount: 0, weightSurchargeAmount: 0, createdOn: 1794070800, depositedAt: '2026-11-08T00:00:00Z', serverNow: '2026-11-08T10:00:00Z', pickupDeadline: '2026-11-01T00:00:00Z', timeline: [{ id: 'timeline', status: 2, timestamp: 1794070800, note: 'Deposited', actorName: 'Test Customer' }], depositPinCode: 'SECRET_DEPOSIT', pickupPinCode: 'SECRET_PICKUP' })
  const state = { orders: Array.from({ length: 13 }, (_, i) => make(i)), calls: [], writes: [], conflict: false, unknown: false, stale: false, reads: 0, listError: false, noCandidates: false, batchMissing: false, operations: new Map() }
  const candidate = { merchantId, businessName: 'Test Laundry', rating: 5, commissionRate: 20, currentLoad: 2, maxCapacity: 50, distanceKm: 1.2, priority: 1, score: 90 }
  const waitingRow = order => ({ ...order, services: ['Wash'], waitingMinutes: 1501, isOverdue: true })
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, ''), body = req.method() === 'GET' ? null : req.postDataJSON()
    state.calls.push({ path, body })
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    const fail = (status = 500) => route.fulfill({ status, json: { succeeded: false, message: 'admin.invalidResponse' } })
    const paged = (rows, filter) => route.fulfill({ json: { succeeded: true, list: rows.slice((filter.page - 1) * filter.take, filter.page * filter.take), total: rows.length, currentPage: filter.page } })
    if (await adminUpgradeMocks(route, state, [{ id: merchantId, name: 'Test Laundry', status: 1 }])) {
      return
    }
    if (path === '/auth/me') {
      return ok({ id: 'admin-test', role: 'Admin', fullName: 'Test Admin', email: 'admin@example.test' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === `/shipper/${shipperId}`) {
      return ok({ id: shipperId, fullName: 'Test Driver', email: 'driver@example.test', vehicleType: 1, vehiclePlate: '59-ABC', isActive: true })
    }
    if (path.startsWith('/hubs/notifications')) {
      return fail(404)
    }
    if (path === '/merchant/filter') {
      return paged([{ id: merchantId, businessName: 'Test Laundry', phone: '02812345678', imageUrls: ['/mock/merchant.png'] }], body)
    }
    if (path === '/locker/filter') {
      return paged([{ id: lockerId, name: 'Test Locker', imageUrls: ['/mock/locker.png'] }], body)
    }
    if (path === `/merchant/${merchantId}`) {
      return ok({ id: merchantId, phone: '02812345678', imageUrls: ['/mock/merchant.png'] })
    }
    if (path === `/locker/${lockerId}`) {
      return ok({ id: lockerId, imageUrls: ['/mock/locker.png'] })
    }
    if (path === `/wash-service/${serviceId}`) {
      return ok({ id: serviceId, imageUrls: ['/mock/service.png'] })
    }
    if (path === '/wash-order/summary') {
      return ok({ total: state.orders.length, statusCounts: mockStatusCounts(state.orders.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] || 0) + 1 }), {})) })
    }
    if (path === '/wash-order/filter') {
      if (state.listError) {
        return fail()
      }
      return paged(state.orders.filter(row => (!body.status || row.status === body.status) && (!body.merchantId || row.merchantId === body.merchantId) && (!body.lockerId || row.lockerId === body.lockerId)), body)
    }
    if (path === '/order-assignment/filter') {
      return paged(state.orders.filter(row => row.status === 2 && !row.merchantId).map(waitingRow), body)
    }
    if (path.endsWith('/candidates')) {
      return ok({ order: waitingRow(state.orders.find(row => row.id === path.split('/')[2])), merchants: state.noCandidates ? [] : [candidate] })
    }
    if (path === '/order-assignment/auto-suggest') {
      return ok(body.orderIds.map((id, index) => ({ orderId: id, orderCode: state.orders.find(row => row.id === id).orderCode, suggested: state.batchMissing && index === 1 ? null : candidate })))
    }
    if (path === '/order-assignment/auto-assign' || /^\/order-assignment\/.+\/assign$/.test(path)) {
      state.writes.push({ path, body })
      if (state.conflict) {
        return fail(409)
      }
      if (state.unknown) {
        return fail()
      }
      const pairs = body.assignments || [{ orderId: path.split('/')[2], merchantId: body.merchantId }]
      for (const pair of pairs) {
        Object.assign(state.orders.find(row => row.id === pair.orderId), { merchantId: pair.merchantId, merchantName: 'Test Laundry' })
      }
      const results = pairs.map(pair => ({ ...pair, merchantName: 'Test Laundry', commissionRateApplied: 20 }))
      return ok(body.assignments ? results : results[0])
    }
    if (path === '/wash-order/move-to-storage') {
      state.writes.push({ path, body })
      if (state.unknown) {
        return fail()
      }
      const order = state.orders.find(row => row.id === body.orderId)
      Object.assign(order, { status: 13, ...body, movedToStorageAt: '2026-11-08T10:00:00Z' })
      return ok(order)
    }
    if (path.endsWith('/available-shippers')) {
      return ok([{ id: shipperId, fullName: 'Test Driver', avatarUrl: null }])
    }
    if (path.includes('/operations/')) {
      return state.operations.has(path.split('/').at(-1)) ? ok(state.operations.get(path.split('/').at(-1))) : fail(404)
    }
    if (path === '/wash-order/status' || path === '/wash-order/assign-shipper') {
      state.writes.push({ path, body })
      if (state.conflict) {
        return fail(409)
      }
      if (state.unknown) {
        return fail()
      }
      const order = state.orders.find(row => row.id === body.orderId)
      Object.assign(order, path.endsWith('/status') ? { status: body.newStatus } : { shipperId: body.shipperId, shipperName: 'Test Driver' })
      order.revision++
      return ok(order)
    }
    if (/^\/wash-order\/[\da-f-]+$/.test(path)) {
      const order = state.orders.find(row => row.id === path.split('/').at(-1))
      if (!order) {
        return fail(404)
      }
      state.reads++
      if (state.stale && state.reads > 1) {
        order.revision++
      }
      return ok({ ...order, allowedActions: { ...mockOrderActions(order), canAssignShipper: !!order.merchantId && [2, 9].includes(order.status), canUpdateWeight: false, canMoveToStorage: order.status === 10, canCancelExpiredDeposit: order.status === 1 && order.isDepositExpired === true } })
    }
    throw new Error(`Unexpected Admin order API: ${req.method()} ${path}`)
  })
  return state
}
