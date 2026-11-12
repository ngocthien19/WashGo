// Contracts added by the November backend update. All writes stay inside mocked routes.
export async function adminUpgradeMocks(route, state, merchants = []) {
  const request = route.request(), url = new URL(request.url()), path = url.pathname.replace(/^\/api/, '')
  const body = /application\/json/.test(request.headers()['content-type'] || '') ? request.postDataJSON() : null
  const records = [...(state.lockers || []), ...(state.merchants || []), ...(state.orders || []), ...(state.requests || []), ...['service', 'proposal', 'promotion', 'incident', 'settlement', 'refund', 'value'].map(key => state[key]).filter(Boolean)]
  records.forEach(row => {
    row.version ??= 'version-1'
  })
  const ok = data => route.fulfill({ json: { succeeded: true, data } })
  if (path === '/admin/audit-logs/filter') {
    state.auditFilters ??= []; state.auditFilters.push(body)
    await route.fulfill({ json: { succeeded: true, list: [], total: 0, currentPage: body.page } }); return true
  }
  if (path === '/files/documents' && request.method() === 'POST') {
    state.documents ??= []
    const text = request.postDataBuffer().toString('utf8')
    const name = text.match(/filename="([^"]+)"/)?.[1] || 'document.pdf'
    const kindName = text.match(/name="kind"\r\n\r\n([^\r]+)/)?.[1]
    const document = { fileId: `a1111111-1111-4111-8111-${String(state.documents.length + 1).padStart(12, '0')}`, kind: { BusinessLicense: 1, Contract: 2, Sla: 3 }[kindName] || 1, originalFileName: name, contentType: 'application/pdf', size: 32, uploadedAt: '2026-11-11T00:00:00Z' }
    state.documents.push(document); await ok(document); return true
  }
  if (/^\/files\/documents\/[^/]+(?:\/download)?$/.test(path)) {
    const id = path.split('/')[3], document = state.documents?.find(item => item.fileId === id)
    if (!document) {
      await route.fulfill({ status: 404, json: { succeeded: false } })
    } else if (path.endsWith('/download')) {
      await route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\nMock document\n%%EOF' })
    } else {
      await ok(document)
    }
    return true
  }
  const page = (rows, query = body || Object.fromEntries(url.searchParams)) => route.fulfill({ json: { succeeded: true, list: rows.slice((Number(query.page || 1) - 1) * Number(query.take || 12), Number(query.page || 1) * Number(query.take || 12)), total: rows.length, currentPage: Number(query.page || 1) } })
  if (path.startsWith('/admin-operations/')) {
    const operation = state.adminOperations?.get(path.split('/').at(-1))
    if (operation) {
      await ok(operation)
    } else {
      await route.fulfill({ status: 404, json: { succeeded: false } })
    }
    return true
  }
  if (path === '/admin/lookups/merchants') {
    await page((state.merchants || merchants).map(row => ({ id: row.id, name: row.name || row.businessName, status: row.status || 1 }))); return true
  }
  if (path === '/admin/lookups/lockers') {
    await page(state.lockers || [{ id: state.orders?.[0]?.lockerId, name: 'Test Locker', status: 1 }]); return true
  }
  if (path === '/merchant/cities') {
    await ok([...new Set((state.merchants || []).map(row => row.city).filter(Boolean))]); return true
  }
  if (path === '/merchant/summary') {
    const rows = state.merchants || []
    await ok({ total: rows.length, active: rows.filter(row => row.status === 1).length, inactive: rows.filter(row => row.status === 2).length, suspended: rows.filter(row => row.status === 3).length, pendingProfileRequests: state.requests?.filter(row => row.status === 1).length || 0, generatedAt: '2026-11-11T00:00:00Z' }); return true
  }
  if (path === '/wash-service/summary') {
    await ok({ total: state.removed ? 0 : 1, pendingProposals: state.proposal?.status === 1 ? 1 : 0, counts: { [`Approved:${state.service.isActive ? 'Active' : 'Inactive'}`]: state.removed ? 0 : 1 }, generatedAt: '2026-11-11T00:00:00Z' }); return true
  }
  if (path === '/promotion/summary') {
    await ok({ total: state.removed ? 0 : 1, counts: { [{ 0: 'Inactive', 1: 'Upcoming', 2: 'Active', 3: 'Expired', 4: 'Exhausted' }[state.promotion.status]]: state.removed ? 0 : 1 }, generatedAt: '2026-11-11T00:00:00Z' }); return true
  }
  if (path === '/incident/summary') {
    await ok({ total: 1, counts: { [{ 1: 'Pending', 2: 'Resolved', 3: 'Rejected', 4: 'Withdrawn' }[state.incident.status]]: 1 }, generatedAt: '2026-11-11T00:00:00Z' }); return true
  }
  if (/^\/(wash-service|locker|promotion)\/batch$/.test(path)) {
    state.writes.push({ path, body, method: request.method() })
    const rows = state.lockers || [state.service || state.promotion]
    const items = body.items.map(item => {
      const row = rows.find(row => row.id === item.id)
      if (!row || item.expectedVersion !== row.version || body.action === 'Delete' && row.canDelete === false) {
        return { id: item.id, succeeded: false, statusCode: 409, message: 'VersionMismatch' }
      }
      if (body.action === 'Delete') {
        state.removed = true
      } else if (body.status != null) {
        row.status = body.status
      } else {
        row.isActive = body.isActive; if (state.promotion) {
          row.status = body.isActive ? 2 : 0
        }
      }
      return { id: item.id, succeeded: true, statusCode: 200 }
    })
    const result = { operationId: body.operationId, state: 'Completed', items }
    state.adminOperations ??= new Map()
    state.adminOperations.set(body.operationId, { operationId: body.operationId, state: 'Completed', action: 'Batch', resourceId: 'batch', result: { succeeded: true, data: result } })
    if (state.batchUnknown) {
      await route.fulfill({ status: 500, json: { succeeded: false } })
    } else {
      await ok(result)
    }
    return true
  }
  if (path === `/promotion/${state.promotion?.id}/status`) {
    state.writes.push({ path, body, method: request.method() })
    if (state.unknown) {
      await route.fulfill({ status: 500, json: { succeeded: false } })
    } else {
      Object.assign(state.promotion, { isActive: body.isActive, status: body.isActive ? 2 : 0 }); await ok(state.promotion)
    }
    return true
  }
  if (/^\/promotion\/[^/]+\/usages\/filter$/.test(path)) {
    await page(state.usages || []); return true
  }
  if (/^\/incident\/[^/]+\/messages\/page$/.test(path)) {
    await page(state.messages || []); return true
  }
  if (path === '/payment/refund-requests/filter') {
    state.queries.push({ path, body })
    await page([state.refund].filter(row => (!body.status || row.status === body.status) && (!body.orderId || row.orderId === body.orderId))); return true
  }
  if (path === '/finance/commissions/paged') {
    const row = state.commission
    await ok({ page: body.page, take: body.take, total: 1, items: [row], grossRevenue: row.grossRevenue, refundedAmount: row.refundedAmount, netRevenue: row.netRevenue, commissionAmount: row.commissionAmount, payoutAmount: row.payoutAmount, ordersWithoutCommissionSnapshot: 0, commissionComplete: true, generatedAt: '2026-11-12T00:00:00Z' }); return true
  }
  if (path === '/finance/settlements/quote') {
    state.commissionReads++
    await ok({ quoteToken: state.changedPreview && state.commissionReads > 1 ? 'changed-quote' : 'quote-1', canCreate: state.canCreate !== false, summary: { ...state.commission }, breakdown: { lines: [] } }); return true
  }
  if (/^\/finance\/settlements\/[^/]+$/.test(path) && request.method() === 'GET') {
    state.reads++
    if (state.stale && state.reads > 2) {
      state.settlement.status = 2
    }
    await ok(state.settlement); return true
  }
  if (/^\/finance\/settlements\/[^/]+\/lines$/.test(path)) {
    await route.fulfill({ json: { succeeded: true, list: state.lines || [], total: state.lines?.length || 0, isSnapshot: state.isSnapshot !== false, basis: 'Frozen source lines', generatedAt: '2026-11-12T00:00:00Z' } }); return true
  }
  if (path === '/system-setting/history/filter') {
    state.historyQueries ??= []; state.historyQueries.push(body); await page(state.history || []); return true
  }
  if (/^\/wash-order\/[^/]+\/admin-cancellation-quote$/.test(path)) {
    const row = state.orders.find(item => item.id === path.split('/')[2])
    await ok({ orderId: row.id, revision: row.revision, status: row.status, canCancel: row.status === 1, depositDeadline: '2026-11-01T00:00:00Z', serverNow: '2026-11-11T00:00:00Z', paidAmount: 50000, feeAmount: state.changedQuote ? 20000 : 15000, refundAmount: state.changedQuote ? 30000 : 35000, feeOutstanding: 0 }); return true
  }
  if (/^\/wash-order\/[^/]+\/cancel-expired-deposit$/.test(path)) {
    const row = state.orders.find(item => item.id === path.split('/')[2])
    state.writes.push({ path, body }); Object.assign(row, { status: 12, revision: row.revision + 1 })
    await ok(row); return true
  }
  return false
}
