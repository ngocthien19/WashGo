import { expect, test } from '@playwright/test'
import { merchantSession } from '../helpers/merchantSession'

const id = index => `ca000000-0000-0000-0000-${String(index).padStart(12, '0')}`
async function setup(page, options = {}) {
  await merchantSession(page, { role: 'Admin', ...options })
  const state = { rows: Array.from({ length: 23 }, (_, index) => ({ id: id(index + 1), code: `CAT_${index + 1}`, name: `Category ${String(index + 1).padStart(2, '0')}`, description: 'Category description', sortOrder: index, isActive: true, version: 'v1', serviceCount: index === 0 ? 3 : 0, pendingProposalCount: 0, canEdit: true, canDelete: index !== 0, canChangeStatus: true, deleteReasonCode: index === 0 ? 'CategoryInUse' : null })), writes: [], filters: [], unknown: false, operation: null }
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, '')
    const body = req.method() === 'GET' ? null : req.postDataJSON()
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    if (path === '/auth/me') {
      return ok({ id: 'admin-test', fullName: 'Test Admin', role: 'Admin' })
    }
    if (path === '/notification/unread-count') {
      return ok(0)
    }
    if (path === '/admin/service-categories/filter') {
      state.filters.push(body)
      const rows = state.rows.filter(row => (body.isActive == null || row.isActive === body.isActive) && (!body.keyword || `${row.code} ${row.name}`.toLowerCase().includes(body.keyword.toLowerCase())))
      rows.sort((a, b) => (body.sortBy === 'sortOrder' ? a.sortOrder - b.sortOrder : a[body.sortBy].localeCompare(b[body.sortBy])) * (body.isDescending ? -1 : 1))
      return route.fulfill({ json: { succeeded: true, list: rows.slice((body.page - 1) * body.take, body.page * body.take), total: rows.length, currentPage: body.page, totalPages: Math.ceil(rows.length / body.take) } })
    }
    if (path.startsWith('/admin/service-categories/operations/')) {
      return ok(state.operation)
    }
    if (path.startsWith('/admin/service-categories/batch/')) {
      state.writes.push({ path, body })
      const result = { operationId: body.operationId, state: 'Completed', items: body.items.map(item => {
        const row = state.rows.find(row => row.id === item.id)
        if (path.endsWith('/delete') && row.serviceCount) {
          return { id: row.id, succeeded: false, statusCode: 409, outcome: 'Failed', reasonCode: 'CategoryInUse', dependencyCounts: { services: row.serviceCount, pendingProposals: 0 } }
        }
        if (path.endsWith('/delete')) {
          state.rows = state.rows.filter(value => value.id !== row.id)
        } else {
          Object.assign(row, { isActive: body.isActive, version: 'v2' })
        }
        return { id: row.id, succeeded: true, statusCode: 200, outcome: 'Changed', version: 'v2', affectedServiceCount: row.serviceCount }
      }) }
      state.operation = result
      if (state.unknown) {
        state.operation = { ...result, state: 'Processing' }; state.unknown = false; return route.fulfill({ status: 503, json: { succeeded: false } })
      }
      return ok(result)
    }
    if (path === '/admin/service-categories' && req.method() === 'POST') {
      state.writes.push({ path, body })
      const row = { ...body, id: id(100), version: 'v1', serviceCount: 0, pendingProposalCount: 0, canEdit: true, canDelete: true, canChangeStatus: true }
      state.rows.push(row); return ok(row)
    }
    const row = state.rows.find(row => path === `/admin/service-categories/${row.id}`)
    if (row && req.method() === 'GET') {
      return ok(row)
    }
    if (row && req.method() === 'PUT') {
      state.writes.push({ path, body }); Object.assign(row, body, { version: 'v2' }); return ok(row)
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return state
}

test('Admin category table shows the server total and supports create, edit and guarded status changes', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/categories')
  await expect(page.getByRole('heading', { name: 'Total categories', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Active categories', exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'categories found' })).toHaveText('23categories found')
  await page.getByRole('button', { name: 'Add category', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Category code', exact: true }).fill('SPECIAL_CARE')
  await dialog.getByRole('textbox', { name: 'Category name', exact: true }).fill('Special care')
  await dialog.getByRole('button', { name: 'Save category', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes[0].body).toMatchObject({ code: 'SPECIAL_CARE', name: 'Special care', operationId: expect.any(String) })
  await rowAction(page, 'Category 02', 'Edit category')
  dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('textbox', { name: 'Category code', exact: true })).toHaveAttribute('readonly')
  await dialog.getByRole('textbox', { name: 'Category name', exact: true }).fill('Renamed category')
  await dialog.getByRole('button', { name: 'Save category', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.writes[1].body.expectedVersion).toBe('v1')
  await rowAction(page, 'Category 01', 'Lock')
  dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('3 services')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Results by category', exact: true })).toBeVisible()
  expect(state.writes[2].body).toMatchObject({ isActive: false, items: [{ id: id(1), expectedVersion: 'v1' }] })
})

test('batch delete keeps partial results and does not delete a referenced category', async ({ page }) => {
  const state = await setup(page, { dark: true })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/admin/categories')
  await page.getByRole('checkbox', { name: 'Select Category 01', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Select Category 02', exact: true }).check()
  await page.getByRole('button', { name: 'Bulk actions', exact: true }).click()
  await page.getByRole('tab', { name: 'Delete selected', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog).toContainText('CategoryInUse')
  await expect(dialog).toContainText('Changed')
  expect(state.rows.some(row => row.id === id(1))).toBe(true)
  expect(state.rows.some(row => row.id === id(2))).toBe(false)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('unknown category batch can be reopened and resumes the exact operation after a read-only check', async ({ page }) => {
  const state = await setup(page); state.unknown = true
  await page.goto('/admin/categories')
  await rowAction(page, 'Category 01', 'Lock')
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Resume original operation', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
  await page.getByRole('button', { name: 'Recover category operation', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Check result', exact: true }).click()
  expect(state.writes).toHaveLength(1)
  await dialog.getByRole('button', { name: 'Resume original operation', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Results by category', exact: true })).toBeVisible()
  expect(state.writes).toHaveLength(2)
  expect(state.writes[1].body).toEqual(state.writes[0].body)
})

async function rowAction(page, name, action) {
  await page.getByRole('button', { name: `Actions for ${name}`, exact: true }).click()
  await page.getByRole('menuitem', { name: action, exact: true }).click()
}

test('category statistics stay global while filters and paging use the server, and stale edits are blocked', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/admin/categories?keyword=Category+01')
  await expect(page.getByRole('status').filter({ hasText: 'categories found' })).toHaveText('1categories found')
  await expect(page.getByRole('heading', { name: 'Total categories', exact: true }).locator('..')).toContainText('23')
  await page.goto('/admin/categories?page=2')
  await expect(page.getByRole('table')).toContainText('Category 23')
  await page.goto('/admin/categories')
  await rowAction(page, 'Category 02', 'Edit category')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Category name', exact: true }).fill('Draft change')
  state.rows[1].version = 'changed-elsewhere'
  await dialog.getByRole('button', { name: 'Save category', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('category changed')
  await expect(dialog.getByRole('button', { name: 'Save category', exact: true })).toBeDisabled()
  expect(state.writes).toHaveLength(0)
})

test('category modal keeps its shared header and footer fixed while the selected items scroll', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await setup(page)
  await page.goto('/admin/categories')
  await expect(page.getByRole('table')).toBeVisible()
  if (process.env.CATEGORY_QA) {
    await page.screenshot({ path: 'test-results/category-table-qa.png' })
  }
  await page.getByRole('checkbox', { name: 'Select categories on this page', exact: true }).check()
  await page.getByRole('button', { name: 'Bulk actions', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const header = dialog.locator('[data-dialog-header]'), footer = dialog.locator('form > footer'), body = dialog.locator('form > div').first()
  const before = { header: await header.boundingBox(), footer: await footer.boundingBox() }
  await body.evaluate(element => {
    element.scrollTop = element.scrollHeight
  })
  expect(await body.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect((await header.boundingBox()).y).toBeCloseTo(before.header.y, 0)
  expect((await footer.boundingBox()).y).toBeCloseTo(before.footer.y, 0)
  if (process.env.CATEGORY_QA) {
    await page.screenshot({ path: 'test-results/category-modal-qa.png' })
  }
})


test('category search reuses suggestions and filter labels stay compact', async ({ page }) => {
  await setup(page)
  await page.goto('/admin/categories')
  for (const label of ['Status', 'Sort by', 'Direction']) {
    await expect(page.getByRole('combobox', { name: label, exact: true })).toHaveCSS('font-size', '14px')
  }
  const search = page.getByRole('combobox', { name: /Search category code or name/ })
  await search.fill('Category 02')
  const option = page.getByRole('option').filter({ hasText: 'Category 02' })
  await expect(option).toBeVisible()
  await option.click()
  await expect(page).toHaveURL(/keyword=Category/)
  await expect(page.getByRole('status').filter({ hasText: 'categories found' })).toHaveText('1categories found')
  await expect(page.getByRole('heading', { name: 'Search', exact: true })).toHaveCSS('font-size', '14px')
  await page.getByRole('button', { name: 'Add category', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('textbox', { name: 'Category name', exact: true })).toHaveCSS('font-size', '16px')
  await expect(dialog.getByRole('textbox', { name: 'Category name', exact: true }).locator('..').locator('span').first()).toHaveCSS('font-size', '14px')
  await expect(dialog.getByRole('textbox', { name: 'Category name', exact: true })).toHaveAttribute('placeholder', 'Enter category name')
  await expect(dialog.getByRole('textbox', { name: 'Category name', exact: true })).toHaveAttribute('aria-required', 'true')
  await expect(dialog.getByRole('button', { name: 'Save category', exact: true })).toHaveCSS('font-size', '16px')
})


for (const dark of [false, true]) {
  test(`category details and lock/unlock dialogs show clear information in ${dark ? 'dark' : 'light'} mode`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const state = await setup(page, { dark })
    await page.goto('/admin/categories')
    await rowAction(page, 'Category 01', 'Category details')
    let dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Category 01', exact: true })).toBeVisible()
    await expect(dialog.getByText('CAT_1', { exact: true })).toHaveCount(1)
    await expect(dialog.getByText('Related services', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Pending proposals', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Category description', { exact: true })).toBeVisible()
    await expect(dialog).not.toContainText('CategoryInUse')
    if (process.env.CATEGORY_QA) {
      await page.screenshot({ path: `test-results/category-detail-${dark ? 'dark' : 'light'}.png` })
    }
    await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
    await rowAction(page, 'Category 01', 'Lock')
    dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Lock category', exact: true })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'What this action changes', exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled()
    if (process.env.CATEGORY_QA) {
      await page.screenshot({ path: `test-results/category-lock-${dark ? 'dark' : 'light'}.png` })
    }
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(dialog.getByRole('heading', { name: 'Results by category', exact: true })).toBeVisible()
    expect(state.rows[0].isActive).toBe(false)
    await dialog.getByRole('button', { name: 'Close', exact: true }).last().click()
    await rowAction(page, 'Category 01', 'Unlock')
    dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Activate category', exact: true })).toBeVisible()
    if (dark) {
      await page.setViewportSize({ width: 375, height: 812 })
    }
    if (process.env.CATEGORY_QA) {
      await page.screenshot({ path: `test-results/category-activate-${dark ? 'dark' : 'light'}.png` })
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expect(dialog.getByRole('heading', { name: 'Results by category', exact: true })).toBeVisible()
    expect(state.rows[0].isActive).toBe(true)
  })
}
