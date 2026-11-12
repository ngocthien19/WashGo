import { adminUpgradeMocks } from './adminUpgradeMocks'
import { merchantSession } from './merchantSession'

export const lockerId = '50000000-0000-4000-8000-000000000001'
export const merchantId = '60000000-0000-4000-8000-000000000001'
export async function setupAdminLockers(page, options = {}) {
  await merchantSession(page, { role: 'Admin', ...options })
  const merchants = [1, 2, 3].map((value, index) => ({ id: `60000000-0000-4000-8000-${String(value).padStart(12, '0')}`, businessName: ['Central Laundry', 'Second Laundry', 'Suspended Laundry'][index], status: value === 3 ? 3 : 1 }))
  const lockers = Array.from({ length: 13 }, (_, index) => ({
    id: `50000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, code: `LK-${index + 1}`, name: index === 0 ? 'Central Locker' : `Locker ${index + 1}`,
    address: '123 Test Street', ward: 'Test Ward', city: index === 12 ? 'Other City' : 'Test City', district: 'Legacy district', latitude: 10.77, longitude: 106.7,
    status: 1, lockerType: 1, description: 'Station at the main entrance', totalBoxes: 4, availableBoxes: 1, emptyBoxesCount: 1,
    imageUrls: ['/uploads/mock/locker.svg'], serviceAreaId: '70000000-0000-4000-8000-000000000001', serviceAreaName: 'Central area',
    merchants: merchants.slice(0, 2).map((row, index) => ({ merchantId: row.id, businessName: row.businessName, priority: index + 1 })),
    boxes: [1, 2, 3, 4].map((status, box) => ({ id: `80000000-0000-4000-8000-${String(index * 4 + box + 1).padStart(12, '0')}`, boxNumber: String(box + 1), status, size: 2 }))
  }))
  const state = { lockers, merchants, filters: [], summaries: [], histories: [], writes: [], reads: 0, uploads: 0, listError: false, unknown: false, stale: false, reject: false }
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/api/, '')
    const body = /application\/json/.test(request.headers()['content-type'] || '') ? request.postDataJSON() : undefined
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    const fail = (status, message = 'admin.invalidResponse') => route.fulfill({ status, json: { succeeded: false, message } })
    const list = (rows, query) => route.fulfill({ json: { succeeded: true, list: rows.slice((query.page - 1) * query.take, query.page * query.take), total: rows.length, currentPage: query.page } })
    if (await adminUpgradeMocks(route, state, [])) {
      return
    }
    if (path === '/auth/me') {
      return ok({ id: 'admin-test', fullName: 'Test Admin', role: 'Admin', email: 'admin@example.test' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return route.fulfill({ status: 404, json: {} })
    }
    if (path.startsWith('/uploads/mock/')) {
      return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#96baff"/></svg>' })
    }
    if (path === '/merchant/filter') {
      return list(merchants, body)
    }
    if (path === '/locker/column-distinct-values') {
      return ok([{ value: 'Test City' }, { value: 'Other City' }])
    }
    if (path === '/locker/summary') {
      state.summaries.push(url.search)
      const boxes = state.lockers.flatMap(row => row.boxes)
      return ok({ totalLockers: state.lockers.length, activeLockers: state.lockers.filter(row => row.status === 1).length, maintenanceLockers: state.lockers.filter(row => row.status === 2).length, inactiveLockers: state.lockers.filter(row => row.status === 3).length, totalBoxes: boxes.length, availableBoxes: boxes.filter(row => row.status === 1).length, occupiedBoxes: boxes.filter(row => row.status === 2).length, reservedBoxes: boxes.filter(row => row.status === 3).length, maintenanceBoxes: boxes.filter(row => row.status === 4).length })
    }
    if (path === '/locker/filter') {
      state.filters.push(body)
      if (state.listError) {
        return fail(500)
      }
      const rows = state.lockers.filter(row => (!body.status || row.status === body.status) && (!body.city || row.city === body.city) && (!body.merchantId || row.merchants.some(m => m.merchantId === body.merchantId)) && (!body.keyword || `${row.name} ${row.code} ${row.address}`.toLowerCase().includes(body.keyword.toLowerCase())))
      return list(rows, body)
    }
    if (/^\/locker\/[^/]+\/usage-history$/.test(path)) {
      state.histories.push(Object.fromEntries(url.searchParams))
      return route.fulfill({ json: { succeeded: true, total: 1, currentPage: Number(url.searchParams.get('page')), list: [{ usageId: 'order-1:1', orderId: '90000000-0000-4000-8000-000000000001', orderCode: 'WG-LOCKER-01', boxId: lockers[0].boxes[0].id, boxNumber: '1', usageType: 1, putInAt: '2026-11-07T12:00:00Z', takenOutAt: null, orderStatus: 2 }] } })
    }
    if (/^\/locker\/[^/]+$/.test(path) && request.method() === 'GET') {
      state.reads++
      const locker = state.lockers.find(row => row.id === path.split('/').at(-1))
      if (!locker) {
        return fail(404)
      }
      if (state.stale && state.reads > 1) {
        locker.description = 'Another admin changed this station'
      }
      return ok(locker)
    }
    if (path === '/files/images') {
      state.uploads++; return ok({ url: '/uploads/mock/new.png' })
    }
    if (['POST', 'PUT', 'DELETE'].includes(request.method()) && (path === '/locker' || path === '/locker/box-status' || /^\/locker\/[^/]+$/.test(path))) {
      state.writes.push({ path, body, method: request.method() })
      if (state.unknown) {
        return fail(500)
      }
      if (state.reject) {
        return fail(400, 'admin.lockers.inUse')
      }
      if (request.method() === 'DELETE') {
        state.lockers = state.lockers.filter(row => row.id !== path.split('/').at(-1)); return ok(true)
      }
      if (path === '/locker/box-status') {
        state.lockers.find(row => row.id === body.lockerId).boxes.find(box => box.id === body.boxId).status = body.newStatus; return ok(true)
      }
      if (request.method() === 'POST') {
        const row = { ...state.lockers[0], ...body, id: '50000000-0000-4000-8000-000000000099', code: body.code || 'LK-AUTO', status: 1, merchants: body.merchantIds.map((id, index) => ({ merchantId: id, businessName: merchants.find(m => m.id === id).businessName, priority: index + 1 })), boxes: Array.from({ length: body.boxCount }, (_, index) => ({ id: `new-box-${index}`, boxNumber: String(index + 1), size: body.defaultBoxSize, status: 1 })), totalBoxes: body.boxCount, emptyBoxesCount: body.boxCount }
        state.lockers.push(row); return ok(row)
      }
      const row = state.lockers.find(row => row.id === body.id), previousMerchants = row.merchants
      Object.assign(row, body)
      row.merchants = body.merchantIds === null ? previousMerchants : body.merchantIds.map((id, index) => ({ merchantId: id, businessName: merchants.find(m => m.id === id).businessName, priority: index + 1 }))
      return ok(row)
    }
    throw new Error(`Unexpected Admin Locker API: ${request.method()} ${path}`)
  })
  await page.route('https://tile.openstreetmap.de/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path fill="#e6edf4" d="M0 0h256v256H0z"/></svg>' }))
  await page.route('**/reverse?**', route => route.fulfill({ json: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { housenumber: '123', street: 'Test Street', district: 'Test Ward', state: 'Ho Chi Minh City' } }] } }))
  return state
}
