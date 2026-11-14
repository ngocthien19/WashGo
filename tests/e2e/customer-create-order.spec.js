import { expect, test } from '@playwright/test'

const services = [
  { id: 'wash', name: 'Everyday wash', unit: 'kg', unitPrice: 30000, description: 'Everyday fabric care', images: '["/uploads/wash.png"]' },
  { id: 'iron', name: 'Shirt ironing', unit: 'piece', unitPrice: 10000, pricePerItem: 12000 }
]
const slots = [{ id: 'box-one', slotNumber: 1, size: 2 }, { id: 'box-two', slotNumber: 2, size: 3 }]
const locker = { id: 'locker-one', name: 'Ben Thanh Locker', address: '123 Le Loi', city: 'Ho Chi Minh City', latitude: 10.7769, longitude: 106.7009, images: '["/uploads/locker.png"]', availableSlotCount: 2, availableSlots: slots }
const envelope = (data) => ({ succeeded: true, data, statusCode: 200 })
const paged = (list) => ({ succeeded: true, list, total: list.length, totalPages: 1, currentPage: 1 })

test('customer suggestions show matching fields, prices, single-line tooltips and keyboard search', async ({ page }) => {
  await setup(page)
  const longName = 'Everyday wash with specialist fabric treatment and extra care for delicate clothing'
  const requests = []
  await page.route('**/customer/services/filter', async (route) => {
    const body = route.request().postDataJSON()
    requests.push(body)
    await route.fulfill({ json: paged([
      { ...services[0], name: longName, code: 'LAUNDRY01' },
      ...(body.take === 50 ? Array.from({ length: 6 }, (_, index) => ({ ...services[0], id: `extra-${index}`, name: `Other service ${index}` })) : [])
    ]) })
  })
  await page.goto('/customer/services')
  const input = page.getByRole('combobox').first()
  await input.fill('EVERYDAY')
  const option = page.getByRole('option', { name: /Everyday wash/ })
  await expect(option).toBeVisible()
  await expect(page.getByRole('option')).toHaveCount(7)
  const popup = page.getByRole('listbox').locator('..')
  await expect.poll(() => popup.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  expect(requests.at(-1)).toMatchObject({ keyword: 'everyday', take: 50, page: 1 })
  await expect(option.getByRole('img')).toBeVisible()
  await expect(option).toContainText('30,000')
  const name = option.getByText(longName, { exact: true })
  await expect(name).toHaveCSS('font-weight', '700')
  await expect(name).toHaveCSS('white-space', 'nowrap')
  await name.hover()
  await expect(page.getByRole('tooltip', { name: longName })).toBeVisible()
  await input.press('Escape')
  await expect(option).toHaveCount(0)
  await input.fill('laundry')
  await expect(option).toBeVisible()
  await expect(option.getByText('LAUNDRY01', { exact: true })).toHaveCSS('font-weight', '700')
  await input.press('ArrowDown')
  await input.press('Enter')
  await expect(page).toHaveURL(/keyword=Everyday/)
  await expect(page.getByRole('option')).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/customer/lockers')
  const lockerSearch = page.getByRole('combobox').first()
  await lockerSearch.fill('LE LOI')
  const lockerOption = page.getByRole('option', { name: /Ben Thanh/ })
  await expect(lockerOption).toBeVisible()
  await expect(lockerOption.getByRole('img')).toBeVisible()
  await expect(lockerOption.getByText(/123 Le Loi/)).toHaveCSS('font-weight', '700')
  await expect(lockerOption.getByText('Ben Thanh Locker', { exact: true })).toHaveCSS('font-weight', '400')
  const bounds = await lockerOption.boundingBox()
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390)
  await lockerOption.click()
  await expect(page).toHaveURL(/keyword=Ben/)
})

test('customer suggestions debounce, discard outdated responses and keep manual search available on errors', async ({ page }) => {
  await setup(page)
  const keywords = []
  await page.route('**/customer/services/filter', async (route) => {
    const body = route.request().postDataJSON()
    if (body.take !== 50) {
      return route.fulfill({ json: paged(services) })
    }
    keywords.push(body.keyword)
    if (body.keyword === 'old') {
      await new Promise((resolve) => setTimeout(resolve, 700))
    }
    if (body.keyword === 'error') {
      return route.fulfill({ status: 503, json: { succeeded: false, message: 'Temporarily unavailable' } })
    }
    await route.fulfill({ json: paged(body.keyword === 'empty' ? [] : [{ ...services[0], name: `${body.keyword} result` }]) })
  })
  await page.goto('/customer/services')
  const input = page.getByRole('combobox').first()
  await input.fill('old')
  await expect.poll(() => keywords.includes('old')).toBe(true)
  await input.fill('new')
  await expect(page.getByRole('option', { name: /new result/ })).toBeVisible()
  await expect(page.getByRole('option', { name: /old result/ })).toHaveCount(0)
  await input.fill('a')
  await expect(page.getByRole('option', { name: /a result/ })).toBeVisible()
  await input.fill('empty')
  await expect(page.getByRole('status')).toContainText('No matching suggestions')
  await input.fill('error')
  await expect(page.getByRole('status')).toContainText('Suggestions are unavailable')
  await input.press('Enter')
  await expect(page).toHaveURL(/keyword=error/)
  await expect(page.getByRole('option')).toHaveCount(0)
})

test('search suggests from one character and Delete/Backspace remove one character without clearing the draft', async ({ page }) => {
  await setup(page)
  await page.goto('/customer/services')
  const input = page.getByRole('search').getByRole('combobox')
  await input.fill('wa')
  await expect(page.getByRole('option').first()).toBeVisible()
  await input.press('Home')
  await input.press('Delete')
  await expect(input).toHaveValue('a')
  await expect(page.getByRole('option').first()).toBeVisible()
  await input.press('Delete')
  await expect(input).toHaveValue('')
  await expect(page.getByRole('option')).toHaveCount(0)
  await input.fill('wa')
  await input.press('End')
  await input.press('Backspace')
  await expect(input).toHaveValue('w')
  await expect(page.getByRole('option').first()).toBeVisible()
  await input.press('Escape')
  await expect(input).toHaveValue('w')
  await expect(page.getByRole('option')).toHaveCount(0)
  await input.press('Backspace')
  await expect(input).toHaveValue('')
  await input.fill('w')
  await expect(page.getByRole('option').first()).toBeVisible()
  await input.press('ControlOrMeta+A')
  await input.press('Delete')
  await expect(input).toHaveValue('')
})

async function setup(page, options = {}) {
  const state = { creates: [], quotes: [], conflicted: false, lockerQueries: [] }
  const identity = { id: 'customer-test', role: 'Customer', fullName: 'Alex Test', email: 'alex@example.test' }
  await page.addInitScript(({ identity, dark }) => {
    localStorage.setItem('persist:root', JSON.stringify({
      auth: JSON.stringify({ user: identity, accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresAt: '2099-01-01T00:00:00Z' }),
      preferences: JSON.stringify({ language: 'en', serviceTermsSeen: { 'customer-test': true } }), theme: JSON.stringify({ mode: dark ? 'dark' : 'light' }),
      _persist: JSON.stringify({ version: 1, rehydrated: true })
    }))
  }, { identity, dark: options.dark })
  await page.route('https://tile.openstreetmap.de/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path fill="#edf2f7" d="M0 0h256v256H0z"/><path stroke="white" stroke-width="12" d="M0 72h256M64 0v256"/></svg>' }))
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '').replace(/\/$/, '')
    if (path.startsWith('/uploads/')) {
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMC/wCfyO0AAAAASUVORK5CYII=', 'base64') })
    }
    let data
    if (path === '/auth/me') {
      data = envelope(identity)
    } else if (path === '/customer/services/filter') {
      data = paged(options.homeFour && request.postDataJSON().take === 4 ? Array.from({ length: 4 }, (_, index) => ({ ...services[0], id: `featured-${index}`, name: `Featured ${index + 1}` })) : services)
    } else if (path === '/customer/services/wash') {
      data = envelope(services[0])
    } else if (path === '/customer/lockers') {
      const query = Object.fromEntries(new URL(request.url()).searchParams)
      state.lockerQueries.push(query)
      data = paged(query.latitude ? [locker, { ...locker, id: 'nearby-other', name: 'Another nearby locker', distanceKm: 0.35 }] : [locker])
    } else if (path === '/customer/lockers/locker-one') {
      const availableSlots = state.conflicted ? [slots[1]] : slots
      data = envelope({ ...locker, availableSlots, ...(options.allSlots ? { slots: [...availableSlots.map((slot) => ({ ...slot, status: 1 })), { id: 'occupied', slotNumber: 3, size: 2, status: 2 }, { id: 'maintenance', slotNumber: 4, size: 2, status: 4 }] } : {}) })
    } else if (path === '/wash-order/apply-voucher') {
      const body = request.postDataJSON()
      state.quotes.push(body)
      if (body.promotionCode === 'BAD') {
        await route.fulfill({ status: 400, json: { succeeded: false, message: 'Mã giảm giá không tồn tại.' } })
        return
      }
      const totalAmount = body.items.reduce((sum, item) => sum + (item.serviceId === 'wash' ? 30000 : 12000 * item.quantity), 0)
      const discountAmount = body.promotionCode ? 5000 : 0
      data = envelope({ totalAmount, discountAmount, finalAmount: totalAmount - discountAmount, appliedPromotion: body.promotionCode ? { code: body.promotionCode } : null, availablePromotions: [{ id: 'promotion', code: 'SAVE5', description: 'Save on your laundry', discountType: 1, discountValue: 10, minOrderAmount: 30000, maxDiscountAmount: 5000, endAt: '2026-12-31T16:59:59Z', remainingUsesForCustomer: 2, isEligible: true, estimatedDiscountAmount: 5000 }, { id: 'fixed', code: 'FIXED3', discountType: 2, discountValue: 3000, minOrderAmount: 0, isEligible: true, estimatedDiscountAmount: 3000 }] })
    } else if (path === '/wash-order') {
      state.creates.push(request.postDataJSON())
      if (options.conflict && !state.conflicted) {
        state.conflicted = true
        await route.fulfill({ status: 409, json: { succeeded: false, message: 'Ô này vừa được đặt. Vui lòng chọn ô khác.' } })
        return
      }
      data = envelope({ id: 'created-order', orderCode: 'WG2611051234', lockerName: locker.name, boxNumber: state.creates.at(-1).boxId === slots[0].id ? 1 : 2, finalAmount: 49000, includedWeightKg: 5, depositPinCode: '654321', qrCodeString: 'WASHGO:DEPOSIT:WG2611051234:654321', serverNow: new Date().toISOString(), depositDeadline: new Date(Date.now() + 45 * 60000).toISOString(), depositWindowMinutes: 45, isDepositExpired: false })
    } else {
      await route.fulfill({ status: 404, json: { succeeded: false } })
      return
    }
    await route.fulfill({ json: data })
  })
  await page.goto('/customer/orders/new')
  await expect(page.getByRole('heading', { name: 'Create an order', exact: true })).toBeVisible()
  return state
}

test('catalog images appear in service and locker cards/details; all supplied slots remain read-only unless available', async ({ page }) => {
  await setup(page, { allSlots: true })
  await expect(page.getByRole('img', { name: 'Everyday wash', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Select Everyday wash', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Everyday wash', exact: true })).toHaveCount(2)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: /^Ben Thanh Locker/ }).click()
  const filters = page.getByRole('group', { name: 'Filter compartment status', exact: true })
  await expect(filters.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(filters.getByRole('button', { name: /Clear/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Compartment 3 Standard', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Compartment 4 Standard', exact: true })).toBeDisabled()
  await filters.getByRole('button', { name: 'Occupied', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Compartment 3 Standard', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Compartment 1 Standard', exact: true })).toHaveCount(0)
  await page.goto('/customer/services')
  await expect(page.getByRole('img', { name: 'Everyday wash', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'View details for Everyday wash', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('img')).toBeVisible()
  if (process.env.CATALOG_QA) {
    await page.screenshot({ path: 'test-results/catalog-service-detail.png' })
  }
  await page.goto('/customer/lockers')
  await expect(page.getByRole('img', { name: 'Ben Thanh Locker', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Details/, exact: true }).click()
  const detail = page.getByRole('dialog')
  await expect(detail.getByRole('img')).toBeVisible()
  await expect(detail.getByText('Occupied', { exact: true })).toBeVisible()
  await expect(detail.getByText('Maintenance', { exact: true })).toBeVisible()
  if (process.env.CATALOG_QA) {
    await page.screenshot({ path: 'test-results/catalog-locker-detail.png' })
  }
})

async function chooseLocker(page) {
  await page.getByRole('button', { name: 'Select Everyday wash', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: /^Ben Thanh Locker/ }).click()
  await page.getByRole('button', { name: 'Compartment 1 Standard', exact: true }).click()
  await expect.poll(() => page.getByRole('group', { name: 'Choose a drop-off compartment', exact: true })
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(12)
  const filters = page.getByRole('group', { name: 'Filter compartment status', exact: true })
  await filters.getByRole('button', { name: 'Selected', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Compartment 2 Large', exact: true })).toHaveCount(0)
  await filters.getByRole('button', { name: 'Occupied', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Choose a drop-off compartment', exact: true })).toContainText('No compartments match this filter.')
  await filters.getByRole('button', { name: 'Available', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Compartment 1 Standard', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirm order', exact: true })).toBeEnabled()
}

test('mixed services, server voucher and confirmation work with language switching', async ({ page }) => {
  const state = await setup(page)
  await page.getByRole('button', { name: 'Select Shirt ironing', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Quantity for Shirt ironing' }).fill('2')
  await chooseLocker(page)
  await page.getByRole('radio', { name: 'MoMo', exact: true }).evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await page.getByRole('radio', { name: 'MoMo', exact: true }).click()
  await page.getByRole('textbox', { name: 'Order note (optional)' }).fill('Care for colours')
  await expect(page.getByLabel('Promotion code', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('img', { name: 'Everyday wash', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Ben Thanh Locker', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Choose a WashGo discount', exact: true }).click()
  const percentPromotion = page.getByRole('dialog').getByRole('button', { name: /SAVE5/ })
  await expect(percentPromotion).toContainText('10% off')
  await expect(percentPromotion).toContainText(/Minimum order:.*30,000/)
  await expect(percentPromotion).toContainText(/Up to.*5,000/)
  await expect(percentPromotion).toContainText(/Estimated saving for this order:.*5,000/)
  await expect(percentPromotion).toContainText('You have 2 uses left')
  const fixedPromotion = page.getByRole('dialog').getByRole('button', { name: /FIXED3/ })
  await expect(fixedPromotion).toContainText(/3,000/)
  await expect(fixedPromotion).not.toContainText('%')
  await page.getByRole('dialog').getByRole('button', { name: /SAVE5/ }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: /SAVE5/ })).toHaveAttribute('aria-pressed', 'true')
  expect(state.quotes.at(-1).promotionCode).toBeNull()
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click()
  await expect(page.getByText('Code SAVE5 applied')).toHaveCount(0)
  await page.getByRole('button', { name: 'Choose a WashGo discount', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /SAVE5/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByText('Code SAVE5 applied')).toBeVisible()
  await page.getByRole('button', { name: 'SAVE5', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: /SAVE5/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Order note (optional)' }).hover()
  await page.getByRole('button', { name: 'Remove promotion code', exact: true }).hover()
  await expect(page.getByRole('tooltip').filter({ hasText: 'Remove promotion code' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove promotion code', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Choose a WashGo discount', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Choose a WashGo discount', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: /SAVE5/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByText('Code SAVE5 applied')).toBeVisible()
  await page.getByRole('button', { name: 'Change language', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  await expect(page.getByRole('textbox', { name: /Ghi chú cho đơn hàng/ })).toHaveValue('Care for colours')
  await expect(page.getByText('Đã áp dụng mã SAVE5')).toBeVisible()
  await page.getByRole('button', { name: 'Xác nhận tạo đơn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tạo đơn thành công!' })).toBeVisible()
  expect(state.creates).toHaveLength(1)
  expect(state.creates[0]).toEqual({ lockerId: locker.id, boxId: slots[0].id, returnLockerId: locker.id, paymentMethod: 3, customerNote: 'Care for colours', promotionCode: 'SAVE5', items: [{ serviceId: 'iron', quantity: 2 }, { serviceId: 'wash', quantity: 1 }] })
  await expect(page.getByText('654321', { exact: true })).toHaveCount(0)
  const persisted = await page.evaluate(() => localStorage.getItem('persist:root'))
  expect(persisted).not.toContain('654321')
  expect(persisted).not.toContain('Care for colours')
  const success = page.locator('section[aria-labelledby="order-success-title"]')
  await expect(success.getByRole('img', { name: 'Mã QR gửi đồ', exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Tạo đơn thành công!' })).toHaveCount(0)
  await expect(success.getByText('Thời hạn được áp dụng cho đơn này: 45 phút.')).toBeVisible()
  await expect(success.locator('..')).toHaveCSS('opacity', '1')
  await expect.poll(async () => {
    const actions = await Promise.all(['Đơn hàng của tôi', 'Xem thông tin thanh toán', 'Trang chủ'].map((name) => success.getByRole('button', { name, exact: true }).boundingBox()))
    return Math.max(...actions.map((rect) => rect.y)) - Math.min(...actions.map((rect) => rect.y))
  }).toBeLessThan(1)
  await success.getByRole('button', { name: 'Trang chủ', exact: true }).click()
  await expect(page).toHaveURL('/customer')
})

test('mobile dark mode supports keyboard selection and a compartment conflict', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await setup(page, { dark: true, conflict: true })
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Select Everyday wash', exact: true }).focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: /^Ben Thanh Locker/ }).click()
  await page.getByRole('button', { name: 'Compartment 1 Standard', exact: true }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('This compartment was just reserved')
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Compartment 2 Large', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Order created!' })).toBeVisible()
  expect(state.creates).toHaveLength(2)
  expect(state.creates[1].boxId).toBe(slots[1].id)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('Home shows four service cards and feedback; locker suggestions request location only on demand', async ({ page, context }) => {
  const state = await setup(page, { homeFour: true })
  await page.goto('/customer')
  const featured = page.getByRole('region', { name: 'Services for you', exact: true })
  await expect(featured.getByRole('article')).toHaveCount(4)
  const boxes = await featured.getByRole('article').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().y))
  expect(new Set(boxes.map(Math.round)).size).toBe(1)
  if (process.env.CATALOG_QA) {
    await featured.scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'test-results/customer-home-four.png' })
  }
  await expect(page.getByRole('heading', { name: 'What customers say about WashGo', exact: true })).toBeVisible()
  await page.goto('/customer/lockers')
  const suggestions = page.getByRole('region', { name: 'Lockers near you', exact: true })
  await expect(suggestions).toContainText('Share your location to discover nearby lockers')
  expect(state.lockerQueries.some((query) => query.latitude)).toBe(false)
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 10.77, longitude: 106.69 })
  await suggestions.getByRole('button', { name: 'Use my location', exact: true }).click()
  await expect(suggestions.getByRole('heading', { name: 'Another nearby locker', exact: true })).toBeVisible()
  await expect(suggestions.getByRole('heading', { name: 'Ben Thanh Locker', exact: true })).toHaveCount(0)
  expect(state.lockerQueries.some((query) => query.latitude === '10.77' && query.longitude === '106.69')).toBe(true)
})

test('new order navigation is active and reloading starts a fresh draft', async ({ page }) => {
  const state = await setup(page)
  await expect(page.locator('header').getByRole('link', { name: 'Create an order', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Select Everyday wash', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Selected services (0)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  expect(state.creates).toHaveLength(0)
})

test('whole service and locker choices keep readable, subdued surfaces in dark mode', async ({ page }) => {
  await setup(page)
  const wash = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Everyday wash', exact: true }) })
  const ironing = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Shirt ironing', exact: true }) })
  const themeColors = () => page.evaluate(() => {
    const reference = document.createElement('div')
    const dark = document.documentElement.classList.contains('dark')
    reference.style.backgroundColor = dark ? '#293747' : 'var(--color-blue-50)'
    reference.style.color = dark ? 'var(--foreground)' : 'var(--color-slate-900)'
    document.body.append(reference)
    const color = { background: getComputedStyle(reference).backgroundColor, foreground: getComputedStyle(reference).color }
    reference.style.backgroundColor = 'var(--card)'
    color.idle = getComputedStyle(reference).backgroundColor
    reference.remove()
    return color
  })
  const light = await themeColors()
  const idleSurface = light.idle
  await wash.hover()
  await expect(wash).toHaveCSS('background-color', light.background)
  const lightSurface = await wash.evaluate((element) => getComputedStyle(element).backgroundColor)
  await wash.click()
  await expect(wash.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  const badgeCrossesCorner = (choice) => choice.locator('svg.lucide-check').locator('..').evaluate((badge) => {
    const bounds = badge.getBoundingClientRect()
    const card = badge.parentElement.getBoundingClientRect()
    return bounds.right > card.right && bounds.left < card.right && bounds.top < card.top && bounds.bottom > card.top
  })
  expect(await badgeCrossesCorner(wash)).toBe(true)
  await wash.click()
  await expect(wash.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  await expect(wash).toHaveCSS('background-color', idleSurface)
  await wash.click()
  await wash.getByRole('button').focus()
  await page.keyboard.press('Space')
  await expect(wash.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  await expect(wash).toHaveCSS('background-color', idleSurface)
  await page.keyboard.press('Space')
  await expect(wash.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('heading', { name: 'Create an order', exact: true }).hover()
  await expect(wash).toHaveCSS('background-color', lightSurface)
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  const dark = await themeColors()
  const darkIdleSurface = dark.idle
  await ironing.hover()
  await expect(ironing).toHaveCSS('background-color', dark.background)
  await expect(wash).toHaveCSS('background-color', dark.background)
  await expect(wash).toHaveCSS('color', dark.foreground)
  if (process.env.CATALOG_QA) {
    await page.screenshot({ path: 'test-results/customer-dark-choice.png' })
  }
  await wash.click()
  await expect(wash.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  await expect(wash).toHaveCSS('background-color', darkIdleSurface)
  await wash.click()
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('Step 1 completed', { exact: true })).toBeAttached()
  const lockerChoice = page.getByRole('button', { name: /^Ben Thanh Locker/ })
  await lockerChoice.hover()
  await expect(lockerChoice).toHaveCSS('background-color', lightSurface)
  await lockerChoice.click()
  expect(await badgeCrossesCorner(lockerChoice)).toBe(true)
  await page.getByRole('button', { name: 'Compartment 1 Standard', exact: true }).click()
  await expect(lockerChoice).toHaveCSS('background-color', lightSurface)
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await lockerChoice.hover()
  await expect(lockerChoice).toHaveCSS('background-color', dark.background)
  await page.getByRole('heading', { name: 'Create an order', exact: true }).hover()
  await expect(lockerChoice).toHaveCSS('background-color', dark.background)
  await expect(page.getByText('-', { exact: true })).toBeVisible()
  const back = page.getByRole('button', { name: 'Back', exact: true })
  await back.hover()
  await expect(back).toHaveCSS('color', 'rgb(255, 255, 255)')
})
