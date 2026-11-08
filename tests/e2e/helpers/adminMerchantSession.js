import { merchantSession } from './merchantSession.js'

export const merchantId = '10000000-0000-4000-8000-000000000001'
export const requestId = '20000000-0000-4000-8000-000000000001'
export const profileFields = (row) => Object.fromEntries(['businessName', 'address', 'city', 'latitude', 'longitude', 'phone', 'openingHours', 'imageUrls'].map((key) => [key, row[key]]))
export async function setupAdminMerchants(page, { dark = false } = {}) {
  await merchantSession(page, { role: 'Admin', dark })
  const merchants = Array.from({ length: 13 }, (_, i) => ({ id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, businessName: i === 0 ? 'Ben Thanh Laundry' : `Laundry ${String(i + 1).padStart(2, '0')}`, email: `store${i + 1}@example.test`, phone: '0901234567', taxCode: '0312345678', businessLicense: '"GP-001"', address: '123 Test Street', district: 'District 1', city: 'Ho Chi Minh City', latitude: 10.77, longitude: 106.7, openingHours: '"08:00-20:00"', status: i === 1 ? 3 : 1, rating: 4.5, totalOrders: 10, unfinishedOrders: i === 0 ? 2 : 0, totalRevenue: 1000000, commissionRate: 20, depositAmount: 1000000, serviceRadiusKm: 5, maxCapacity: 50, imageUrls: [], serviceAreaIds: ['30000000-0000-4000-8000-000000000001'], contractStartDate: '2026-10-31T17:00:00Z', contractEndDate: null, slaDocUrl: null }))
  const current = profileFields(merchants[0])
  const state = { merchants, requests: [{ id: requestId, merchantId, merchantName: merchants[0].businessName, status: 1, current, proposed: { ...current, businessName: 'Updated Ben Thanh Laundry' }, changedFields: ['BusinessName'], createdAt: '2026-11-07T12:00:00Z' }], calls: [], writes: [], listError: false, createUnknown: false, updateUnknown: false, lockConflict: false, changeBeforeSave: false, reads: {}, uploads: 0 }
  await page.route('**/api/**', (route) => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, '')
    const body = /application\/json/.test(req.headers()['content-type'] || '') ? req.postDataJSON() : null
    state.calls.push({ path, body })
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    const fail = (status, message = 'admin.invalidResponse') => route.fulfill({ status, json: { succeeded: false, message } })
    const list = (rows, query) => route.fulfill({ json: { succeeded: true, list: rows.slice((query.page - 1) * query.take, query.page * query.take), total: rows.length, currentPage: query.page, totalPages: Math.ceil(rows.length / query.take) } })
    if (path === '/auth/me') {
      return ok({ id: 'admin-test', role: 'Admin', fullName: 'WashGo Admin', email: 'admin@example.test' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return fail(404)
    }
    if (path === '/merchant/filter') {
      if (state.listError && body.take === 12) {
        return fail(500)
      }
      const keyword = (body.keyword || '').toLowerCase()
      return list(state.merchants.filter((row) => (!body.status || row.status === body.status) && (!keyword || `${row.businessName} ${row.address} ${row.phone}`.toLowerCase().includes(keyword)) && (!body.city || row.city === body.city) && (!body.district || row.district === body.district)), body)
    }
    if (path.startsWith('/merchant/') && req.method() === 'GET') {
      const id = path.split('/').at(-1), row = state.merchants.find((item) => item.id === id)
      if (!row) {
        return fail(404)
      }
      state.reads[id] = (state.reads[id] || 0) + 1
      if (state.changeBeforeSave && state.reads[id] > 1) {
        row.address = 'Changed by another Admin'
      }
      return ok(row)
    }
    if (path === '/files/images') {
      state.uploads++; return ok({ url: '/uploads/mock/store.png' })
    }
    if (path === '/merchant' && req.method() === 'POST') {
      state.writes.push({ path, body })
      if (state.createUnknown) {
        return fail(500)
      }
      const row = { ...state.merchants[0], ...body, id: '10000000-0000-4000-8000-000000000099', status: 1, unfinishedOrders: 0, imageUrls: body.imageUrls || [], commissionRate: body.commissionRate ?? 20 }
      state.merchants.push(row); return ok(row)
    }
    if (path === '/merchant' && req.method() === 'PUT') {
      state.writes.push({ path, body })
      if (state.updateUnknown) {
        return fail(500)
      }
      const row = state.merchants.find((item) => item.id === body.id)
      const areas = row.serviceAreaIds
      Object.assign(row, body)
      if (body.serviceAreaIds === null) {
        row.serviceAreaIds = areas
      }
      return ok(row)
    }
    if (path === '/merchant/status') {
      state.writes.push({ path, body })
      if (state.lockConflict) {
        return fail(409)
      }
      const row = state.merchants.find((item) => item.id === body.merchantId)
      if (body.status !== 1 && row.unfinishedOrders && !body.confirm) {
        return fail(409)
      }
      row.status = body.status; row.rejectionReason = body.rejectionReason; return ok(row)
    }
    if (path === '/merchant-profile-request/filter') {
      return list(state.requests.filter((row) => (!body.status || row.status === body.status) && (!body.merchantId || body.merchantId === row.merchantId)), body)
    }
    if (path.startsWith('/merchant-profile-request/')) {
      const id = path.split('/')[2], row = state.requests.find((item) => item.id === id)
      if (!row) {
        return fail(404)
      }
      if (req.method() === 'GET') {
        return ok(row)
      }
      state.writes.push({ path, body })
      if (row.status !== 1) {
        return fail(409)
      }
      row.status = path.endsWith('/approve') ? 2 : 3
      if (row.status === 2) {
        Object.assign(state.merchants.find((item) => item.id === row.merchantId), row.proposed)
      } else {
        row.rejectionReason = body.reason
      }
      return ok(row)
    }
    throw new Error(`Unexpected Admin Merchant API: ${path}`)
  })
  return state
}
