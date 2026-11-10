import { merchantSession } from './merchantSession.js'

export async function setupAdmin(page, { dark = false, guest = false } = {}) {
  if (!guest) {
    await merchantSession(page, { role: 'Admin', dark })
  }
  const profile = { id: 'merchant-test', role: 'Admin', fullName: 'WashGo Admin', email: 'admin@example.test', phone: '0901234567', avatar: null, joinedAt: '2024-01-01T00:00:00Z', accountStatus: 'Active', lastLoginAt: '2026-11-10T00:00:00Z', version: '63935071200123457', editableFields: ['fullName', 'phone', 'avatar'] }
  const activity = { id: '11111111-1111-4111-8111-111111111111', occurredAt: '2026-11-10T01:00:00Z', actorId: profile.id, actorName: profile.fullName, actorRole: 'Admin', module: 'AdminProfile', action: 'Update', resourceType: 'User', resourceId: profile.id, resourceCode: profile.email, result: 1, changedFields: ['phone'], details: { changed: 'phone' }, correlationId: 'request-safe' }
  const state = { calls: [], revenueError: false, dashboardError: false, empty: false, logout: 0, profile, activity, saves: 0, profileConflict: false, unknownSave: false, passwords: 0, wrongPassword: false, revokes: 0, auditQueries: [], alertQueries: [] }
  state.sessions = [{ id: '22222222-2222-4222-8222-222222222222', startedAt: '2026-11-10T00:00:00Z', lastActiveAt: '2026-11-10T01:00:00Z', expiresAt: '2026-12-01T00:00:00Z', isCurrent: true, userAgent: 'Current browser' }, { id: '33333333-3333-4333-8333-333333333333', startedAt: '2026-11-09T00:00:00Z', lastActiveAt: '2026-11-09T01:00:00Z', expiresAt: '2026-12-01T00:00:00Z', isCurrent: false, userAgent: 'Other device' }]
  await page.route('**/api/**', (route) => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, '')
    const body = ['POST', 'PUT'].includes(req.method()) && req.postData()?.startsWith('{') ? req.postDataJSON() : undefined
    state.calls.push({ path, body, method: req.method(), query: Object.fromEntries(new URL(req.url()).searchParams) })
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    const list = (rows, total = rows.length) => route.fulfill({ json: { succeeded: true, list: rows, total, currentPage: 1, totalPages: total ? 1 : 0 } })
    if (path.startsWith('/uploads/mock/')) {
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1cAAAAASUVORK5CYII=', 'base64') })
    }
    if (path === '/auth/me') {
      return ok({ id: profile.id, role: 'Admin', fullName: profile.fullName, email: profile.email, phone: profile.phone, avatar: profile.avatar })
    }
    if (path === '/admin/profile') {
      if (req.method() === 'PUT') {
        state.saves++
        state.savedRaw = req.postData()
        if (state.unknownSave) {
          return route.fulfill({ status: 500, json: { succeeded: false } })
        }
        if (state.profileConflict) {
          return route.fulfill({ status: 409, json: { succeeded: false } })
        }
        for (const key of ['fullName', 'phone', 'avatar']) {
          if (body[key] != null) {
            profile[key] = body[key] || null
          }
        }
        profile.version = String(BigInt(profile.version) + 1n)
      }
      const raw = JSON.stringify({ succeeded: true, data: profile }).replace(/"version":"(\d+)"/, '"version":$1')
      return route.fulfill({ contentType: 'application/json', body: raw })
    }
    if (path === '/files/images') {
      return ok({ url: '/uploads/mock/admin-avatar.png' })
    }
    if (path === '/auth/security') {
      return ok({ hasPassword: true, passwordChangedAt: '2026-10-01T00:00:00Z', lastLoginAt: '2026-11-10T00:00:00Z', googleLinked: false, twoFactorSupported: false, twoFactorEnabled: false, activeSessions: state.sessions.length })
    }
    if (path === '/auth/sessions') {
      return ok(state.sessions)
    }
    if (path === '/auth/change-password') {
      state.passwords++
      if (state.wrongPassword) {
        return route.fulfill({ status: 400, json: { succeeded: false, message: 'Current password is incorrect' } })
      }
      if (body.revokeOtherSessions) {
        state.sessions = state.sessions.filter(r => r.isCurrent)
      }
      return ok(true)
    }
    if (path === '/auth/sessions/revoke-others' || (path.startsWith('/auth/sessions/') && req.method() === 'DELETE')) {
      state.revokes++
      const before = state.sessions.length
      state.sessions = state.sessions.filter(r => path.endsWith('revoke-others') ? r.isCurrent : r.id !== path.split('/').at(-1))
      return ok({ revoked: before - state.sessions.length })
    }
    if (path === '/admin/me/activities' || path === '/admin/audit-logs/filter') {
      state.auditQueries.push({ personal: path.includes('/me/'), query: body || Object.fromEntries(new URL(req.url()).searchParams) })
      const rows = state.activities
      if (rows) {
        const query = body || Object.fromEntries(new URL(req.url()).searchParams)
        const offset = (Number(query.page || 1) - 1) * Number(query.take || 10)
        return list(rows.slice(offset, offset + Number(query.take || 10)), rows.length)
      }
      return list([activity], 12)
    }
    if (path.startsWith('/admin/audit-logs/')) {
      return ok(state.activities?.find(row => row.id === path.split('/').at(-1)) || activity)
    }
    if (path === '/admin/dashboard') {
      if (state.dashboardError) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      const metric = (current, previous = 0) => ({ current: state.empty ? 0 : current, previous, changePercent: previous ? (current - previous) / previous * 100 : null, isNew: previous === 0 && current > 0 })
      const q = new URL(req.url()).searchParams
      return ok({ generatedAt: '2026-11-10T01:00:00Z', period: 'custom', fromDate: new Date(Number(q.get('fromDate')) * 1000).toISOString(), toDate: new Date(Number(q.get('toDate')) * 1000).toISOString(), customers: { total: 123, locked: 4, new: metric(10, 5) }, merchants: { active: 12, inactive: 2, suspended: 1, new: metric(2, 1) }, orders: { created: metric(3, 2), completed: metric(1, 1), cancelled: metric(1, 0), waitingAssignment: 8, currentByStatus: { Washing: 1, Completed: 1, Cancelled: 1 } }, revenue: { total: metric(950000, 900000), laundryRevenue: 1000000, storageFeeRevenue: 0, cancellationFeeRevenue: 0, refundedAmount: 50000 }, lockers: { total: 5, active: 4, maintenance: 1, inactive: 0, availableBoxes: 4, totalBoxes: 10, nearlyFull: 1 }, topMerchants: [{ merchantId: '11111111-1111-4111-8111-111111111111', businessName: 'Ben Thanh Laundry', status: 1, completedOrders: 1, cancelledOrders: 0, finishedOrders: 1, completionRate: 100, rating: null, ratingCount: 0, laundryRevenue: 1000000 }], definitions: {} })
    }
    if (path === '/admin/alerts') {
      const q = new URL(req.url()).searchParams, pageNumber = Number(q.get('page')), take = Number(q.get('take'))
      state.alertQueries.push(Object.fromEntries(q))
      const rows = state.alertRows || [{ type: 1, severity: 3, source: 'Rule', resourceType: 'Order', resourceId: '11111111-1111-4111-8111-111111111111', resourceCode: 'WG-ALERT', deadline: '2026-11-09T00:00:00Z', overdueMinutes: 100 }]
      const filtered = rows.filter(r => (!q.get('type') || r.type === Number(q.get('type'))) && (!q.get('severity') || r.severity === Number(q.get('severity'))))
      return ok({ generatedAt: '2026-11-10T01:00:00Z', page: pageNumber, take, total: filtered.length, totalAll: rows.length, summary: [{ type: 1, severity: 3, count: rows.length }], items: filtered.slice((pageNumber - 1) * take, pageNumber * take) })
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
