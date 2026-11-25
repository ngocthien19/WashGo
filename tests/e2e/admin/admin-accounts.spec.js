import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'

const id = number => `ac000000-0000-0000-0000-${String(number).padStart(12, '0')}`
const grants = ['Accounts.ManageAdmins', 'Accounts.ReadDeleted', 'Accounts.Restore']
const makeAccount = number => ({
  id: id(number), revision: 3, avatarUrl: null, fullName: `Account ${String(number).padStart(2, '0')}`, email: `account${number}@example.test`, phone: '0901234567',
  role: number === 5 ? 'Admin' : number === 4 ? 'Merchant' : number === 3 ? 'Shipper' : 'Customer', isActive: true, isDeleted: false, isProtected: false,
  signInMethod: 'Password', hasPassword: true, googleLinked: false, createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z', lastLoginAt: null,
  permissions: number === 5 || number === 99 ? grants : null,
  obligations: { openOrders: number === 1 ? 2 : 0, pendingPayments: 0, openRefunds: 0, openIncidents: 0, unsettledSettlements: 0, activeShippers: 0, lockerAssignments: 0, activeTasks: number === 3 ? 1 : 0, loyaltyPoints: 0, heldLoyaltyPoints: 0, deleteBlockers: number === 1 ? ['OpenOrders'] : [], items: [] }
})
async function setup(page, options = {}) {
  await merchantSession(page, { role: 'Admin', dark: options.dark })
  const state = { rows: Array.from({ length: 24 }, (_, index) => makeAccount(index + 1)), writes: [], queries: [], unknown: false, operation: null, authenticated: false, activityReads: 0 }
  const caller = { ...makeAccount(99), role: 'Admin', fullName: 'Current Admin', permissions: options.restricted ? [] : grants }
  const caps = (row, detail = false) => ({ canEdit: !row.isDeleted, canChangeEmail: !row.isDeleted, canLock: !row.isDeleted && row.isActive && row.id !== caller.id,
    canUnlock: !row.isDeleted && !row.isActive, canDelete: !row.isDeleted && row.id !== caller.id && !(detail && row.obligations.deleteBlockers.length),
    canRestore: row.isDeleted && ['Customer', 'Admin'].includes(row.role) && !options.restricted,
    canManagePermissions: row.role === 'Admin' && row.id !== caller.id && !options.restricted, requiresReauthentication: row.role === 'Admin', blocked: [] })
  const dto = (row, detail = false) => ({ ...row, capabilities: caps(row, detail) })
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(/^\/api/, '')
    const body = req.method() === 'GET' ? null : req.postDataJSON()
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    const fail = (status, code) => route.fulfill({ status, json: { succeeded: false, meta: { code }, message: code } })
    if (path === '/auth/me') {
      return ok({ id: caller.id, fullName: caller.fullName, email: caller.email, role: 'Admin' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === '/merchant/filter') {
      return route.fulfill({ json: { succeeded: true, list: [{ id: id(4), businessName: 'Laundry Partner', email: 'partner@example.test', phone: '0901234567', address: '123 Street', city: 'City', district: '', status: 1, latitude: 10, longitude: 106, commissionRate: 20, depositAmount: 1000000, totalRevenue: 0, totalOrders: 0, unfinishedOrders: 0, maxCapacity: 50, serviceRadiusKm: 5, imageUrls: [], serviceAreaIds: [] }], total: 1, currentPage: 1, totalPages: 1 } })
    }
    if (path === '/auth/reauthenticate') {
      state.writes.push({ path, body }); state.authenticated = body.password === 'correct-password'
      return state.authenticated ? ok({ reauthenticatedUntil: '2099-01-01T00:00:00Z' }) : fail(400, 'WrongPassword')
    }
    if (path === '/admin/accounts/summary') {
      return ok({ total: state.rows.filter(row => !row.isDeleted).length, active: state.rows.filter(row => row.isActive && !row.isDeleted).length, locked: state.rows.filter(row => !row.isActive && !row.isDeleted).length, deleted: options.restricted ? null : state.rows.filter(row => row.isDeleted).length })
    }
    if (path === '/admin/accounts' && req.method() === 'GET') {
      state.queries.push(Object.fromEntries(url.searchParams))
      let rows = state.rows.filter(row => (url.searchParams.get('deleted') === 'Only' ? row.isDeleted : url.searchParams.get('deleted') === 'Include' || !row.isDeleted)
        && (!url.searchParams.get('keyword') || `${row.fullName} ${row.email}`.toLowerCase().includes(url.searchParams.get('keyword').toLowerCase()))
        && (!url.searchParams.get('role') || row.role === url.searchParams.get('role'))
        && (!url.searchParams.has('isActive') || String(row.isActive) === url.searchParams.get('isActive')))
      const sort = url.searchParams.get('sortBy') || 'createdAt'
      if (sort === 'fullName') {
        rows = rows.toSorted((a, b) => a.fullName.localeCompare(b.fullName) * (url.searchParams.get('sortDirection') === 'desc' ? -1 : 1))
      }
      const pageNumber = Number(url.searchParams.get('page') || 1), take = Number(url.searchParams.get('take') || 20)
      return ok({ items: rows.slice((pageNumber - 1) * take, pageNumber * take).map(row => dto(row)), total: rows.length, page: pageNumber, take, hasMore: pageNumber * take < rows.length })
    }
    if (path.startsWith('/admin/accounts/operations/')) {
      return state.operation ? ok(state.operation) : fail(404, 'NotFound')
    }
    if (path === '/admin/accounts/bulk/preview') {
      const items = body.ids.map(accountId => {
        const row = state.rows.find(item => item.id === accountId)
        const codes = body.action === 'SoftDelete' && row.obligations.deleteBlockers.length ? ['AccountHasOpenObligations'] : row.id === id(3) && body.action === 'Lock' ? ['HasActiveTasks'] : []
        return { ...row, found: true, canApply: !codes.length, reasonCodes: codes, requiresConfirmation: body.action === 'Lock' && row.obligations.openOrders > 0, requiresReauthentication: false, alreadyInTargetState: false, openOrders: row.obligations.openOrders, activeTasks: row.obligations.activeTasks, deleteBlockers: row.obligations.deleteBlockers }
      })
      return ok({ action: body.action, canApply: items.filter(item => item.canApply).length, blocked: items.filter(item => !item.canApply).length, items })
    }
    if (path === '/admin/accounts/bulk') {
      state.writes.push({ path, body })
      const items = body.items.map(item => {
        const row = state.rows.find(value => value.id === item.id)
        if (row.obligations.deleteBlockers.length && body.action === 'SoftDelete') {
          return { id: row.id, succeeded: false, statusCode: 409, outcome: 'Failed', reasonCode: 'AccountHasOpenObligations' }
        }
        row.revision++; if (body.action === 'SoftDelete') {
          row.isDeleted = true; row.isActive = false
        } else {
          row.isActive = body.action === 'Unlock'
        }
        return { id: row.id, succeeded: true, statusCode: 200, outcome: 'Changed', version: String(row.revision) }
      })
      return ok({ operationId: body.operationId, state: 'Completed', items, totals: { changed: items.filter(item => item.succeeded).length, unchanged: 0, skipped: 0, failed: items.filter(item => !item.succeeded).length, succeeded: items.filter(item => item.succeeded).length } })
    }
    if (path === '/admin/accounts' && req.method() === 'POST') {
      state.writes.push({ path, body })
      const partner = body.merchant || body.shipper
      const row = { ...makeAccount(100), ...body, ...(partner ? { fullName: partner.businessName || partner.fullName, phone: partner.phone, email: partner.email } : {}), credentialDelivery: 1 }
      state.rows.push(row)
      if (state.unknown) {
        state.unknown = false
        state.operation = { operationId: body.operationId, action: 'Create', resourceId: partner ? `new:${body.role}` : 'new', state: 'Completed', result: { succeeded: true, data: dto(row, true) } }
        return fail(503, 'Unavailable')
      }
      return ok(dto(row, true))
    }
    const match = path.match(/^\/admin\/accounts\/([\da-f-]+)(?:\/(.*))?$/)
    if (match) {
      const row = match[1] === caller.id ? caller : state.rows.find(value => value.id === match[1]), action = match[2]
      if (!row) {
        return fail(404, 'NotFound')
      }
      if (action === 'activities') {
        state.activityReads++
        return route.fulfill({ json: { succeeded: true, list: [{ id: id(90), actorName: 'Current Admin', action: 'Update', result: 1, occurredAt: '2026-11-21T10:00:00Z', reason: 'Contact updated' }], total: 1, currentPage: 1, totalPages: 1 } })
      }
      if (req.method() === 'GET') {
        return ok(dto(row, true))
      }
      state.writes.push({ path, body })
      if (row.role === 'Admin' && !state.authenticated) {
        return fail(403, 'ReauthenticationRequired')
      }
      if (body.expectedRevision !== row.revision) {
        return fail(409, 'RevisionConflict')
      }
      if (action === 'email-change') {
        return ok({ newEmail: body.newEmail, expiresAt: new Date(Date.now() + 600000).toISOString() })
      }
      if (action === 'email-change/confirm') {
        row.email = body.newEmail
      }
      if (action === 'status') {
        row.isActive = body.isActive
      }
      if (action === 'soft-delete') {
        row.isDeleted = true; row.isActive = false; row.deletedAt = '2026-11-21T10:00:00Z'
      }
      if (action === 'restore') {
        row.isDeleted = false; row.isActive = false
      }
      if (action === 'permissions') {
        row.permissions = body.permissions
      }
      if (req.method() === 'PATCH') {
        Object.assign(row, { fullName: body.fullName, phone: body.phone, avatarUrl: body.avatarUrl })
      }
      row.revision++
      const value = dto(row, true)
      if (state.unknown) {
        state.unknown = false
        state.operation = { operationId: body.operationId, action: action === 'status' ? body.isActive ? 'Unlock' : 'Lock' : 'Update', resourceId: row.id, state: 'Completed', result: { succeeded: true, data: value } }
        return fail(503, 'Unavailable')
      }
      return ok(value)
    }
    return fail(404, 'NotFound')
  })
  return state
}
async function choose(page, name, value, scope = page) {
  await scope.getByRole('combobox', { name, exact: true }).click()
  await page.getByRole('option', { name: value, exact: true }).click()
}
async function action(page, name, label) {
  await page.getByRole('button', { name: `Actions for ${name}`, exact: true }).click()
  await page.getByRole('menuitem', { name: label, exact: true }).click()
}

test('account page uses real server totals, paginates and sends role/search/sort filters', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/accounts')
  await expect(page.getByRole('heading', { name: '24 accounts', exact: true })).toBeVisible({ timeout: 15000 })
  await expect.poll(() => page.getByRole('main').evaluate(element => Number.parseFloat(getComputedStyle(element).marginLeft))).toBe(288)
  await page.screenshot({ path: 'tests/ci/results/accounts-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Account 24', exact: true })).toBeVisible()
  await choose(page, 'Role', 'Administrator')
  await expect(page.getByRole('button', { name: 'Account 05', exact: true })).toBeVisible()
  expect(state.queries.at(-1)).toMatchObject({ role: 'Admin', page: '1' })
  await choose(page, 'Sort by', 'Name A–Z')
  await expect.poll(() => state.queries.at(-1)).toMatchObject({ sortBy: 'fullName', sortDirection: 'asc' })
  await page.getByRole('combobox', { name: 'Search accounts', exact: true }).fill('Account 05')
  await page.getByRole('option').filter({ hasText: 'account5@example.test' }).click()
  await expect(page.getByRole('heading', { name: '1 accounts', exact: true })).toBeVisible()
  await expect.poll(() => state.queries.at(-1)).toMatchObject({ role: 'Admin', keyword: 'Account 05', page: '1' })
})

test('create validates fields and edit sends only mutable profile fields with revision', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/accounts')
  await page.getByRole('button', { name: 'Add account', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Save account', exact: true }).click()
  await expect(dialog.getByText('Please enter this information.').first()).toBeVisible()
  await dialog.getByRole('textbox', { name: 'Full name', exact: false }).fill('New Customer')
  await dialog.getByRole('textbox', { name: 'Email', exact: false }).fill('new@example.test')
  await dialog.getByRole('textbox', { name: 'Phone number', exact: false }).fill('0907654321')
  await dialog.getByRole('button', { name: 'Save account', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes.at(-1).body).toMatchObject({ role: 'Customer', operationId: expect.any(String), fullName: 'New Customer' })
  await action(page, 'Account 02', 'Edit account')
  dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('textbox', { name: 'Email', exact: true })).toBeDisabled()
  await dialog.getByRole('textbox', { name: 'Full name', exact: false }).fill('Customer Renamed')
  await dialog.getByRole('button', { name: 'Save account', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes.at(-1).body).toMatchObject({ expectedRevision: 3, fullName: 'Customer Renamed' })
  expect(state.writes.at(-1).body).not.toHaveProperty('role')
  expect(state.writes.at(-1).body).not.toHaveProperty('email')
})

test('fresh detail blocks deleting unfinished accounts and lock requires explicit order confirmation', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/accounts')
  await action(page, 'Account 01', 'Soft delete account')
  await expect(page.getByRole('dialog')).toContainText('This action is no longer available')
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click()
  await action(page, 'Account 01', 'Lock account')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Customer requested lock')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  expect(state.writes).toHaveLength(0)
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes.at(-1).body).toMatchObject({ isActive: false, confirm: true, expectedRevision: 3 })
})

test('bulk preview keeps blocked rows visible and displays partial results', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/accounts')
  await page.getByRole('checkbox', { name: 'Select account Account 01', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Select account Account 02', exact: true }).check()
  await page.getByRole('button', { name: 'Bulk actions', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('tab', { name: 'Lock account', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('dialog').getByRole('combobox', { name: 'Choose action', exact: true })).toHaveCount(0)
  await page.getByRole('dialog').getByRole('tab', { name: 'Soft delete account', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('1 / 2 accounts are currently eligible')
  await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Remove unused accounts')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bulk action results' })).toBeVisible()
  await expect(page.getByText('Changed: 1 · Unchanged: 0 · Skipped: 0 · Failed: 1', { exact: true })).toBeVisible()
  expect(state.writes.at(-1).body.items).toEqual([{ id: id(1), expectedRevision: 3 }, { id: id(2), expectedRevision: 3 }])
})

test('unknown result locks duplicate commands and lookup recovers without resubmission', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/accounts')
  await action(page, 'Account 02', 'Lock account')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Security review')
  state.unknown = true
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Check result', exact: false }).click()
  await expect(page.getByText('The outcome of this operation is not yet known.')).toHaveCount(0)
  expect(state.writes.filter(item => item.path.endsWith('/status'))).toHaveLength(1)
})

test('Admin permission changes require own-password reauthentication and preserve existing grants', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/accounts')
  await action(page, 'Account 05', 'Manage permissions')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('checkbox').first()).toBeChecked()
  await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Review access')
  await dialog.getByLabel('Your password', { exact: false }).fill('correct-password')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes.at(-2).path).toBe('/auth/reauthenticate')
  expect(state.writes.at(-1).body).toMatchObject({ permissions: grants, expectedRevision: 3 })
  expect(state.writes.at(-1).body).not.toHaveProperty('password')
})

test('email change has a separate OTP request and confirmation with cooldown', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/accounts')
  await action(page, 'Account 02', 'Change email')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'New email', exact: false }).fill('changed@example.test')
  await dialog.getByRole('button', { name: 'Send verification code', exact: true }).click()
  await expect(dialog.getByRole('button', { name: /Resend in/ })).toBeDisabled()
  await dialog.getByRole('textbox', { name: 'Verification code', exact: false }).fill('123456')
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes.at(-2).body).not.toHaveProperty('operationId')
  expect(state.writes.at(-1).body).toMatchObject({ newEmail: 'changed@example.test', code: '123456', expectedRevision: 3, operationId: expect.any(String) })
})

test('partner creation nests Merchant and Shipper profiles instead of creating orphan accounts', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/accounts')
  await page.getByRole('button', { name: 'Add account', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await choose(page, 'Role', 'Laundry partner', dialog)
  await dialog.getByLabel('Open 24/7', { exact: true }).check()
  await dialog.getByRole('textbox', { name: 'Business name', exact: false }).fill('New Laundry Partner')
  await dialog.getByRole('textbox', { name: 'Email', exact: false }).fill('new-partner@example.test')
  await dialog.getByRole('textbox', { name: 'Phone number', exact: false }).fill('0901234567')
  await dialog.getByRole('textbox', { name: 'Address', exact: false }).fill('123 Street')
  await dialog.getByRole('textbox', { name: 'Province / City', exact: false }).fill('City')
  await dialog.getByRole('spinbutton', { name: 'Latitude', exact: false }).fill('10.75')
  await dialog.getByRole('spinbutton', { name: 'Longitude', exact: false }).fill('106.65')
  await dialog.getByRole('button', { name: 'Save account', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes.at(-1).body).toMatchObject({ role: 'Merchant', merchant: { businessName: 'New Laundry Partner', city: 'City', latitude: 10.75, longitude: 106.65 } })
  expect(state.writes.at(-1).body).not.toHaveProperty('fullName')
  expect(state.writes.at(-1).body.merchant).not.toHaveProperty('district')
  await page.getByRole('button', { name: 'Add account', exact: true }).click()
  dialog = page.getByRole('dialog')
  await choose(page, 'Role', 'Shipper', dialog)
  await dialog.getByRole('textbox', { name: 'Full name', exact: false }).fill('New Courier')
  await dialog.getByRole('textbox', { name: 'Email', exact: false }).fill('new-courier@example.test')
  await dialog.getByRole('textbox', { name: 'Phone number', exact: false }).fill('0901234567')
  await choose(page, 'Managing laundry partner', 'Laundry Partner', dialog)
  await dialog.getByRole('textbox', { name: 'License plate', exact: false }).fill('59A-12345')
  await dialog.getByRole('button', { name: 'Save account', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes.at(-1).body).toMatchObject({ role: 'Shipper', shipper: { merchantId: id(4), fullName: 'New Courier', vehicleType: 1, vehiclePlate: '59A-12345' } })
})

test('a Shipper create with a lost response is recovered through the Account operation without resubmitting', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/accounts')
  await page.getByRole('button', { name: 'Add account', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await choose(page, 'Role', 'Shipper', dialog)
  await dialog.getByRole('textbox', { name: 'Full name', exact: false }).fill('Recovered Courier')
  await dialog.getByRole('textbox', { name: 'Email', exact: false }).fill('recovered-courier@example.test')
  await dialog.getByRole('textbox', { name: 'Phone number', exact: false }).fill('0901234567')
  await choose(page, 'Managing laundry partner', 'Laundry Partner', dialog)
  await dialog.getByRole('textbox', { name: 'License plate', exact: false }).fill('59A-12345')
  state.unknown = true
  await dialog.getByRole('button', { name: 'Save account', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Save account', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  const lookup = page.waitForRequest(request => request.url().includes(`/admin/accounts/operations/${state.operation.operationId}`))
  await page.getByRole('button', { name: 'Check result', exact: false }).click()
  await lookup
  await expect(page.getByText('The outcome of this operation is not yet known.')).toHaveCount(0)
  expect(state.writes.filter(item => item.path === '/admin/accounts')).toHaveLength(1)
  expect(state.rows.filter(row => row.fullName === 'Recovered Courier')).toHaveLength(1)
})

test('deleted accounts can be restored into the locked state and account activities load only when opened', async ({ page }) => {
  const state = await setup(page)
  state.rows[1].isDeleted = true; state.rows[1].isActive = false
  await page.goto('/admin/accounts?deleted=Only')
  await action(page, 'Account 02', 'Restore account')
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(state.rows[1]).toMatchObject({ isDeleted: false, isActive: false })
  await choose(page, 'Deleted accounts', 'Exclude deleted')
  await page.getByRole('button', { name: 'Account 02', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Unfinished orders', { exact: true })).toBeVisible()
  expect(state.activityReads).toBe(0)
  await dialog.getByRole('tab', { name: 'Activity log', exact: true }).click()
  await expect(dialog.getByRole('table', { name: 'Activity log', exact: true })).toBeVisible()
  await expect(dialog.getByRole('columnheader', { name: 'Performed by', exact: true })).toBeVisible()
  await expect(dialog.getByText('Contact updated', { exact: true })).toBeVisible()
  expect(state.activityReads).toBe(1)
})

test('admins without special grants do not get deleted-account filters or Admin creation', async ({ page }) => {
  await setup(page, { restricted: true })
  await page.goto('/admin/accounts')
  await expect(page.getByRole('heading', { name: '24 accounts', exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('combobox', { name: 'Deleted accounts', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Add account', exact: true }).click()
  await page.getByRole('dialog').getByRole('combobox', { name: 'Role', exact: true }).click()
  await expect(page.getByRole('option', { name: 'Administrator', exact: true })).toHaveCount(0)
})

for (const dark of [false, true]) {
  test(`mobile ${dark ? 'dark' : 'light'} account dialogs keep one body scroll and a visible fixed footer`, async ({ page }) => {
    await setup(page, { dark })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/admin/accounts')
    await page.getByRole('button', { name: 'Add account', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'Save account', exact: true })).toBeVisible()
    await page.screenshot({ path: `tests/ci/results/accounts-mobile-${dark ? 'dark' : 'light'}.png` })
    const layout = await dialog.evaluate(element => {
      const body = element.querySelector('[data-dialog-body]'), footer = element.querySelector('[data-dialog-footer]')
      const inputs = [...body.querySelectorAll('input[data-slot=input]:not([type=file])')].filter(input => input.getBoundingClientRect().width > 0)
      const controls = [...inputs, ...body.querySelectorAll('[role=combobox]')]
      const close = [...footer.querySelectorAll('button')].find(button => button.textContent.trim() === 'Close')
      body.scrollTop = body.scrollHeight
      return {
        fonts: controls.map(input => getComputedStyle(input).fontSize),
        placeholders: inputs.map(input => input.placeholder),
        closeWidth: Number.parseFloat(getComputedStyle(close).width), closeHeight: getComputedStyle(close).height,
        dialogScroll: getComputedStyle(element).overflowY, bodyScroll: getComputedStyle(body).overflowY,
        footerBottom: footer.getBoundingClientRect().bottom, viewportHeight: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth
      }
    })
    expect(layout.fonts.every(value => value === '16px'), JSON.stringify(layout)).toBe(true)
    expect(layout.placeholders.every(Boolean), JSON.stringify(layout)).toBe(true)
    expect(layout.closeWidth).toBeGreaterThanOrEqual(96)
    expect(layout.closeHeight).toBe('44px')
    expect(layout.dialogScroll).not.toBe('auto')
    expect(layout.bodyScroll).toBe('auto')
    expect(layout.footerBottom).toBeLessThanOrEqual(layout.viewportHeight)
    expect(layout.overflow).toBe(false)
  })
}
