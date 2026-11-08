import { merchantSession } from './merchantSession.js'

export async function setupAdmin(page, { dark = false, guest = false } = {}) {
  if (!guest) {
    await merchantSession(page, { role: 'Admin', dark })
  }
  const state = { calls: [], revenueError: false, empty: false, logout: 0 }
  await page.route('**/api/**', (route) => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, '')
    const body = req.method() === 'POST' ? req.postDataJSON() : undefined
    state.calls.push({ path, body })
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    const list = (rows, total = rows.length) => route.fulfill({ json: { succeeded: true, list: rows, total, currentPage: 1, totalPages: total ? 1 : 0 } })
    if (path === '/auth/me') {
      return ok({ id: 'admin-test', role: 'Admin', fullName: 'WashGo Admin', email: 'admin@example.test', phone: '0901234567' })
    }
    if (path === '/auth/logout') {
      state.logout++; return ok(true)
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === '/notification') {
      return list([])
    }
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: {} })
    }
    if (path === '/finance/revenue-report') {
      if (state.revenueError) {
        return route.fulfill({ status: 500, json: { succeeded: false, message: 'admin.invalidResponse' } })
      }
      const day = new Date((body.fromDate + 25200) * 1000).toISOString().slice(0, 10)
      return ok({ totalRevenue: state.empty ? 0 : 950000, laundryRevenue: state.empty ? 0 : 1000000, storageFeeRevenue: 0, cancellationFeeRevenue: 0, refundedAmount: state.empty ? 0 : 50000, paidOrderCount: state.empty ? 0 : 3, daily: state.empty ? [] : [{ date: day, revenue: 950000 }], byMerchant: state.empty ? [] : [{ merchantId: 'merchant-1', merchantName: 'Ben Thanh Laundry', revenue: 950000, paidOrderCount: 3 }] })
    }
    if (path === '/wash-order/summary') {
      return ok({ total: state.empty ? 0 : 3, statusCounts: Object.fromEntries(['pending', 'deposited', 'collected', 'washing', 'drying', 'ironing', 'folding', 'awaitingPayment', 'paid', 'readyToReturn', 'returned', 'completed', 'movedToStorage', 'cancelled'].map((key) => [key, !state.empty && ['washing', 'completed', 'cancelled'].includes(key) ? 1 : 0])) })
    }
    if (path === '/merchant/filter') {
      return list([], state.empty ? 0 : 12)
    }
    if (path === '/locker/summary') {
      return ok({ totalLockers: 5, activeLockers: 4, maintenanceLockers: 1, inactiveLockers: 0, totalBoxes: 10, availableBoxes: 4, occupiedBoxes: 3, reservedBoxes: 2, maintenanceBoxes: 1 })
    }
    if (path === '/order-assignment/filter') {
      return list(state.empty ? [] : [{ id: 'order-1', orderCode: 'WG-WAIT-01', lockerName: 'Ben Thanh Locker', waitingMinutes: 1051, isOverdue: true }], state.empty ? 0 : 8)
    }
    if (path === '/wash-order/filter') {
      return list(state.empty ? [] : [{ id: 'order-2', orderCode: 'WG-ADMIN-02', status: 4, lockerName: 'Ben Thanh Locker', createdOn: 1794009600 }])
    }
    throw new Error(`Unexpected Admin API: ${path}`)
  })
  return state
}
