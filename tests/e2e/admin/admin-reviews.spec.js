import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'

const first = '10000000-0000-4000-8000-000000000001', second = '10000000-0000-4000-8000-000000000002', order = '20000000-0000-4000-8000-000000000001', merchant = '30000000-0000-4000-8000-000000000001'
async function setup(page, { legacy = false, dark = false } = {}) {
  await merchantSession(page, { role: 'Admin', dark })
  const state = { queries: [], writes: [], auditQueries: [], auditRows: [], details: 0, stale: false, unknown: false, recovered: false, operation: null, rows: [first, second].map((id, index) => ({ id, orderId: order, orderCode: `WG-REVIEW-${index + 1}`, customerName: 'Customer Example', merchantId: merchant, merchantName: 'Laundry Example', overallStars: 5 - index, qualityStars: 4, comment: index ? 'Careful packaging' : 'Excellent service', createdOn: 1794391200, isHidden: false, imageUrls: [], videoUrls: [], ...(!legacy ? { version: 'v1', canHide: true, canShow: false, canPublish: true } : {}) })) }
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace(/^\/api/, '')
    const body = request.postData() ? request.postDataJSON() : {}
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    const missing = () => route.fulfill({ status: 404, json: { succeeded: false } })
    if (path === '/auth/me') {
      return ok({ id: 'admin-test', role: 'Admin', fullName: 'Admin Example', email: 'admin@example.test' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path.startsWith('/hubs/notifications')) {
      return missing()
    }
    if (path === '/admin/lookups/merchants') {
      return route.fulfill({ json: { succeeded: true, list: [{ id: merchant, name: 'Laundry Example' }], total: 1 } })
    }
    if (path === '/admin/audit-logs/filter') {
      state.auditQueries.push(body)
      return route.fulfill({ json: { succeeded: true, list: state.auditRows, total: state.auditRows.length } })
    }
    if (path.startsWith('/admin/audit-logs/')) {
      return ok(state.auditRows.find(row => row.id === path.split('/').at(-1)))
    }
    if (path === '/rating/filter') {
      state.queries.push(body)
      const rows = state.rows.filter(row => (!body.stars || row.overallStars === body.stars) && (body.isHidden == null || row.isHidden === body.isHidden) && (!body.keyword || `${row.comment} ${row.orderCode} ${row.customerName}`.toLowerCase().includes(body.keyword.toLowerCase())))
      return route.fulfill({ json: { succeeded: true, list: rows, total: rows.length } })
    }
    if (path === '/rating/summary') {
      if (legacy) {
        return missing()
      }
      const visible = state.rows.filter(row => !row.isHidden)
      return ok({ total: 2, visible: visible.length, hidden: 2 - visible.length, visibleAverage: visible.length ? visible.reduce((sum, row) => sum + row.overallStars, 0) / visible.length : null })
    }
    if (path === '/rating/batch') {
      state.writes.push({ path, body }); state.operation = body
      if (state.unknown) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      state.rows[0] = body.action === 'Publish' ? { ...state.rows[0], contentApprovedAt: '2026-11-14T00:00:00Z', version: 'v2', canPublish: false } : { ...state.rows[0], isHidden: body.action === 'Hide', version: 'v2', canHide: false, canShow: true }
      return ok({ operationId: body.operationId, state: 'Completed', items: body.items.map((item, index) => ({ id: item.id, succeeded: index === 0, statusCode: index === 0 ? 200 : 409, outcome: index === 0 ? 'Changed' : 'Failed', message: index === 0 ? null : 'Review changed' })) })
    }
    if (path.startsWith('/admin-operations/Rating/')) {
      if (!state.recovered) {
        return missing()
      }
      return ok({ operationId: state.operation.operationId, state: 'Completed', action: 'Batch', resourceId: 'batch', result: { succeeded: true, data: { operationId: state.operation.operationId, state: 'Completed', items: state.operation.items.map(item => ({ id: item.id, succeeded: true, statusCode: 200, outcome: 'Changed' })) } } })
    }
    if (path.startsWith('/rating/') && path.endsWith('/publish')) {
      state.writes.push({ path, body })
      const index = state.rows.findIndex(row => row.id === path.split('/')[2])
      state.rows[index] = { ...state.rows[index], contentApprovedAt: '2026-11-14T00:00:00Z', canPublish: false, version: 'v2', ...(body.publishForCustomers ? { publicApprovedAt: '2026-11-14T01:00:00Z', canPublishForCustomers: false } : {}) }
      return ok(state.rows[index])
    }
    if (path.startsWith('/rating/') && path.endsWith('/visibility')) {
      state.writes.push({ path, body })
      const id = path.split('/')[2], index = state.rows.findIndex(row => row.id === id)
      state.rows[index] = { ...state.rows[index], isHidden: body.isHidden, hiddenReason: body.reason, version: 'v2', canHide: !body.isHidden, canShow: body.isHidden }
      return ok(state.rows[index])
    }
    if (path.startsWith('/rating/')) {
      if (legacy) {
        return missing()
      }
      state.details++
      const row = state.rows.find(row => row.id === path.split('/')[2])
      return row ? ok({ ...row, ...(state.stale && state.details > 1 ? { version: 'new-version' } : {}) }) : missing()
    }
    throw new Error(`Unexpected review API ${request.method()} ${path}`)
  })
  return state
}
async function bulk(page) {
  await page.getByRole('checkbox', { name: 'Select all reviews on this page', exact: true }).check()
  await page.getByRole('region', { name: 'Bulk review actions' }).getByRole('button', { name: 'Bulk review actions', exact: true }).click()
  return page.getByRole('dialog')
}
async function confirm(dialog) {
  await dialog.getByLabel('Reason for hiding', { exact: true }).fill('Contains personal information')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Hide reviews', exact: true }).click()
}

test('legacy API shows reviews below promotions with read-only detail and disabled bulk writes', async ({ page }) => {
  const state = await setup(page, { legacy: true })
  await page.goto('/admin/reviews')
  await expect(page.getByRole('link', { name: 'Review management', exact: true }).first()).toBeVisible()
  const links = await page.getByRole('navigation', { name: 'Admin navigation' }).first().getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')))
  expect(links.indexOf('/admin/reviews')).toBe(links.indexOf('/admin/promotions') + 1)
  await expect(page.getByRole('table')).toContainText('Excellent service')
  await expect(page.getByText('Review statistics are being updated.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Review actions for WG-REVIEW-1' }).click()
  await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
  await expect(page.getByRole('main')).toContainText('Showing the list snapshot.')
  await expect(page.getByRole('main').getByRole('button', { name: 'Hide reviews', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Back to review management' }).click()
  const dialog = await bulk(page)
  await expect(dialog.getByRole('button', { name: 'Hide reviews', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
})

test('filters use server queries, clear all resets fields and mobile dark layout stays contained', async ({ page }) => {
  const state = await setup(page, { dark: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/reviews?isHidden=false&page=2')
  await expect.poll(() => state.queries.at(-1)?.isHidden).toBe(false)
  await page.getByRole('combobox', { name: 'Search reviews' }).fill('EXCELLENT')
  await page.getByRole('combobox', { name: 'Search reviews' }).press('Enter')
  await expect.poll(() => state.queries.at(-1)?.keyword).toBe('EXCELLENT')
  expect(state.queries.at(-1).page).toBe(1)
  await page.getByLabel('From date', { exact: true }).fill('2026-11-01')
  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await expect(page.getByRole('search').getByRole('combobox')).toHaveValue('')
  await expect(page.getByLabel('From date', { exact: true })).toHaveValue('')
  await expect.poll(() => state.queries.at(-1)?.keyword ?? '').toBe('')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('single moderation validates reason, checks fresh version and preserves customer feedback', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/reviews')
  await page.getByRole('button', { name: 'Review actions for WG-REVIEW-1' }).click()
  await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
  await expect(page.getByRole('main')).toContainText('Customer Example')
  await page.getByRole('main').getByRole('button', { name: 'Hide reviews', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Hide reviews', exact: true }).click()
  await expect(dialog).toContainText('Enter a reason')
  expect(state.writes).toHaveLength(0)
  await confirm(dialog)
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Review updated.', { exact: true })).toBeVisible()
  expect(state.details).toBeGreaterThanOrEqual(2)
  expect(state.writes[0].body).toMatchObject({ expectedVersion: 'v1', isHidden: true, reason: 'Contains personal information' })
  expect(state.writes[0].body.operationId).toBeTruthy()
  expect(state.rows[0].comment).toBe('Excellent service')
})

test('batch sends one explicit command and keeps per-item partial failures visible', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/reviews')
  const dialog = await bulk(page)
  await confirm(dialog)
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Changed', { exact: true })).toBeVisible()
  await expect(page.getByText('Review changed', { exact: true })).toBeVisible()
  await expect(page.getByText('Some reviews could not be updated. Check the results for each review.', { exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ path: '/rating/batch', body: { action: 'Hide', items: [{ id: first, expectedVersion: 'v1' }, { id: second, expectedVersion: 'v1' }] } })
})

test('ambiguous batch survives dialog close and reconciles without another mutation', async ({ page }) => {
  const state = await setup(page); state.unknown = true
  await page.goto('/admin/reviews')
  let dialog = await bulk(page)
  await confirm(dialog)
  await expect(dialog.getByRole('button', { name: 'Check result', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  state.recovered = true
  await page.getByRole('button', { name: 'Check result', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Check result', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Changed', { exact: true })).toHaveCount(2)
  expect(state.writes).toHaveLength(1)
})

test('stale review blocks a visibility write', async ({ page }) => {
  const state = await setup(page); state.stale = true
  await page.goto('/admin/reviews')
  await page.getByRole('button', { name: 'Review actions for WG-REVIEW-1' }).click()
  await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
  await page.getByRole('main').getByRole('button', { name: 'Hide reviews', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await confirm(dialog)
  await expect(dialog).toContainText('This review has changed.')
  await expect(dialog.getByRole('button', { name: 'Hide reviews', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
})

test('bulk restore uses keyboard tabs, skips visible reviews and needs confirmation without a hide reason', async ({ page }) => {
  const state = await setup(page)
  state.rows[0] = { ...state.rows[0], isHidden: true, canShow: true, canHide: false }
  await page.goto('/admin/reviews')
  const dialog = await bulk(page)
  const hide = dialog.getByRole('tab', { name: 'Hide reviews', exact: true })
  await hide.focus(); await hide.press('Home')
  await expect(hide).toHaveAttribute('aria-selected', 'true')
  await hide.press('ArrowRight')
  await expect(dialog.getByRole('tab', { name: 'Restore visibility', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(dialog.getByRole('textbox')).toHaveCount(0)
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Restore visibility', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Changed', { exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0].body).toMatchObject({ action: 'Show', reason: null, items: [{ id: first, expectedVersion: 'v1' }] })
})

test('guests cannot read admin reviews', async ({ page }) => {
  let reads = 0
  await page.route('**/api/**', route => {
    reads++; return route.fulfill({ status: 401, json: { succeeded: false } })
  })
  await page.goto('/admin/reviews')
  await expect(page).toHaveURL(/login/)
  expect(reads).toBe(0)
})

test('review contacts, two-line comments, sticky actions and checkbox cursors remain usable', async ({ page }) => {
  const state = await setup(page)
  const comment = 'Excellent laundry service and careful packaging. '.repeat(20)
  Object.assign(state.rows[0], { comment, customerEmail: 'customer@example.test', customerPhoneNumber: '0901111222', customerAvatarUrl: '/uploads/review-avatar.svg', merchantEmail: 'store@example.test', merchantPhone: '0903333444', merchantImageUrls: ['/uploads/review-store.svg'] })
  await page.route('**/uploads/review-*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="lightblue"/></svg>' }))
  await page.goto('/admin/reviews')
  const table = page.getByRole('table')
  await expect(table).toContainText('customer@example.test')
  await expect(table).toContainText('0903333444')
  await expect(table.getByRole('img', { name: 'Customer Example', exact: true }).first()).toBeVisible()
  const text = table.getByText(comment, { exact: true })
  const metrics = await text.evaluate(el => ({ height: el.clientHeight, full: el.scrollHeight, lineHeight: parseFloat(getComputedStyle(el).lineHeight), width: el.parentElement.clientWidth }))
  expect(metrics.width).toBeGreaterThanOrEqual(300)
  expect(metrics.height).toBeLessThanOrEqual(metrics.lineHeight * 2 + 1)
  expect(metrics.full).toBeGreaterThan(metrics.height)
  await text.hover()
  await expect(page.getByRole('tooltip')).toHaveText(comment.trim())
  await page.mouse.move(0, 0)
  const scroll = page.locator('[data-slot="table-container"]').first()
  await scroll.evaluate(el => {
    el.scrollLeft = el.scrollWidth
  })
  const actions = table.getByRole('columnheader', { name: 'Actions', exact: true })
  expect(await actions.evaluate(el => getComputedStyle(el).zIndex)).toBe('20')
  expect(await actions.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
  await page.getByRole('button', { name: 'Review actions for WG-REVIEW-1' }).click()
  await expect(page.getByRole('menuitem', { name: 'Hide reviews', exact: true })).toBeEnabled()
  await expect(page.getByRole('menuitem', { name: 'Restore visibility', exact: true })).toBeDisabled()
  await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
  const dialog = page.getByRole('main')
  await expect(dialog).toContainText('customer@example.test')
  await expect(dialog).toContainText('store@example.test')
  expect((await dialog.getByRole('button', { name: 'Hide reviews', exact: true }).boundingBox()).height).toBeGreaterThanOrEqual(44)
  await dialog.getByRole('button', { name: 'Hide reviews', exact: true }).click()
  const check = page.getByRole('dialog').getByRole('checkbox')
  expect(await check.evaluate(el => getComputedStyle(el).cursor)).toBe('pointer')
  expect(await check.locator('..').evaluate(el => getComputedStyle(el).cursor)).toBe('pointer')
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Back to review management' }).click()
  const bulkDialog = await bulk(page)
  await bulkDialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  const bulkButton = page.getByRole('region', { name: 'Bulk review actions' }).getByRole('button', { name: 'Bulk review actions', exact: true })
  expect((await bulkButton.boundingBox()).height).toBeGreaterThanOrEqual(48)
  expect(state.writes).toHaveLength(0)
})

test('publishing uses a distinct guarded action and keeps visibility unchanged', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/reviews')
  await page.getByRole('button', { name: 'Review actions for WG-REVIEW-1' }).click()
  await page.getByRole('menuitem', { name: 'Publish content', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Publish content', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Publish content', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Changed', { exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0]).toMatchObject({ path: `/rating/${first}/publish`, body: { expectedVersion: 'v1', operationId: expect.any(String) } })
  expect(state.rows[0].isHidden).toBe(false)
  expect(state.rows[0].comment).toBe('Excellent service')
})

test('customer publishing is explicit, works after merchant approval and closes with a toast', async ({ page }) => {
  const state = await setup(page)
  state.rows[0] = { ...state.rows[0], contentApprovedAt: '2026-11-14T00:00:00Z', canPublish: false, canPublishForCustomers: true }
  await page.goto(`/admin/reviews/${first}`)
  await expect(page.getByRole('button', { name: 'Publish content', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Publish for customers', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('personal information')
  await dialog.getByRole('button', { name: 'Publish for customers', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Publish for customers', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Review updated.', { exact: true })).toBeVisible()
  expect(state.writes[0].body).toMatchObject({ publishForCustomers: true, expectedVersion: 'v1' })
  await expect(page.getByRole('button', { name: 'Publish for customers', exact: true })).toBeDisabled()
})

test('bulk publishing skips hidden reviews and sends one Publish command', async ({ page }) => {
  const state = await setup(page)
  state.rows[1] = { ...state.rows[1], isHidden: true, canHide: false, canShow: true, canPublish: false }
  await page.goto('/admin/reviews')
  const dialog = await bulk(page)
  await dialog.getByRole('tab', { name: 'Hide reviews', exact: true }).press('End')
  await expect(dialog.getByRole('tab', { name: 'Publish content', exact: true })).toHaveAttribute('aria-selected', 'true')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Publish content', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Changed', { exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(1)
  expect(state.writes[0].body).toMatchObject({ action: 'Publish', items: [{ id: first, expectedVersion: 'v1' }] })
  expect(state.rows[1].contentApprovedAt).toBeUndefined()
})

test('review detail is a reloadable page with lazy activity tab and correct scrubbed order references', async ({ page }) => {
  const state = await setup(page, { dark: true })
  state.rows[0].orderCode = 'WG2611141234'
  state.auditRows = [{ id: 'audit-1', occurredAt: '2026-11-14T06:20:00Z', module: 'Rating', action: 'Show', result: 1, actorName: 'Admin Example', actorRole: 'Admin', resourceType: 'OrderRating', resourceId: first, resourceCode: 'WG[number]', reason: 'Phone [number]', changedFields: [] }]
  await page.goto(`/admin/reviews/${first}`)
  await expect(page.getByRole('heading', { name: 'Review details', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.auditQueries).toHaveLength(0)
  await page.getByRole('tab', { name: 'Content', exact: true }).press('End')
  await expect(page).toHaveURL(/tab=activity/)
  await expect(page.getByRole('table', { name: 'Activity log', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Keyword', exact: true })).toHaveAttribute('placeholder', 'Search activity logs…')
  await expect(page.getByRole('tabpanel')).toContainText('WG2611141234')
  await expect(page.getByRole('tabpanel')).not.toContainText('WG[number]')
  await expect(page.getByRole('tabpanel')).toContainText('Phone [number]')
  expect(state.auditQueries[0]).toMatchObject({ resourceId: first, resourceType: 'OrderRating' })
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Activity log', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toContainText('WG2611141234')
  await page.getByRole('button', { name: 'Activity details', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('WG2611141234')
  await expect(page.getByRole('dialog')).not.toContainText('WG[number]')
  await expect(page.getByRole('dialog')).toContainText('Phone [number]')
})

test('pending review operation remains locked after navigating from list to detail', async ({ page }) => {
  const state = await setup(page); state.unknown = true
  await page.goto('/admin/reviews')
  const dialog = await bulk(page)
  await confirm(dialog)
  await expect(dialog.getByRole('button', { name: 'Check result', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Review actions for WG-REVIEW-1' }).click()
  await page.getByRole('menuitem', { name: 'View details', exact: true }).click()
  await expect(page.getByRole('main').getByRole('button', { name: 'Hide reviews', exact: true })).toBeDisabled()
  state.recovered = true
  await page.getByRole('button', { name: 'Check result', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Check result', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(state.writes).toHaveLength(1)
})
