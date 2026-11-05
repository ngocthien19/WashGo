import { expect, test } from '@playwright/test'

const services = [
  { id: 'wash', name: 'Everyday wash', unit: 'kg', unitPrice: 30000, description: 'Everyday fabric care' },
  { id: 'iron', name: 'Shirt ironing', unit: 'piece', unitPrice: 10000, pricePerItem: 12000 }
]
const slots = [{ id: 'box-one', slotNumber: 1, size: 2 }, { id: 'box-two', slotNumber: 2, size: 3 }]
const locker = { id: 'locker-one', name: 'Ben Thanh Locker', address: '123 Le Loi', city: 'Ho Chi Minh City', latitude: 10.7769, longitude: 106.7009, availableSlotCount: 2, availableSlots: slots }
const envelope = (data) => ({ succeeded: true, data, statusCode: 200 })
const paged = (list) => ({ succeeded: true, list, total: list.length, totalPages: 1, currentPage: 1 })

async function setup(page, options = {}) {
  const state = { creates: [], quotes: [], conflicted: false }
  const identity = { id: 'customer-test', role: 'Customer', fullName: 'Alex Test', email: 'alex@example.test' }
  await page.addInitScript(({ identity, dark }) => {
    localStorage.setItem('persist:root', JSON.stringify({
      auth: JSON.stringify({ user: identity, accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresAt: '2099-01-01T00:00:00Z' }),
      preferences: JSON.stringify({ language: 'en' }), theme: JSON.stringify({ mode: dark ? 'dark' : 'light' }),
      _persist: JSON.stringify({ version: 1, rehydrated: true })
    }))
  }, { identity, dark: options.dark })
  await page.route('https://tile.openstreetmap.de/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path fill="#edf2f7" d="M0 0h256v256H0z"/><path stroke="white" stroke-width="12" d="M0 72h256M64 0v256"/></svg>' }))
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '').replace(/\/$/, '')
    let data
    if (path === '/auth/me') {
      data = envelope(identity)
    } else if (path === '/customer/services/filter') {
      data = paged(services)
    } else if (path === '/customer/lockers') {
      data = paged([locker])
    } else if (path === '/customer/lockers/locker-one') {
      data = envelope({ ...locker, availableSlots: state.conflicted ? [slots[1]] : slots })
    } else if (path === '/wash-order/apply-voucher') {
      const body = request.postDataJSON()
      state.quotes.push(body)
      if (body.promotionCode === 'BAD') {
        await route.fulfill({ status: 400, json: { succeeded: false, message: 'Mã giảm giá không tồn tại.' } })
        return
      }
      const totalAmount = body.items.reduce((sum, item) => sum + (item.serviceId === 'wash' ? 30000 : 12000 * item.quantity), 0)
      const discountAmount = body.promotionCode ? 5000 : 0
      data = envelope({ totalAmount, discountAmount, finalAmount: totalAmount - discountAmount, appliedPromotion: body.promotionCode ? { code: body.promotionCode } : null, availablePromotions: [{ id: 'promotion', code: 'SAVE5', description: 'Save on your laundry', isEligible: true, estimatedDiscountAmount: 5000 }] })
    } else if (path === '/wash-order') {
      state.creates.push(request.postDataJSON())
      if (options.conflict && !state.conflicted) {
        state.conflicted = true
        await route.fulfill({ status: 409, json: { succeeded: false, message: 'Ô này vừa được đặt. Vui lòng chọn ô khác.' } })
        return
      }
      data = envelope({ id: 'created-order', orderCode: 'WG2611051234', lockerName: locker.name, boxNumber: state.creates.at(-1).boxId === slots[0].id ? 1 : 2, finalAmount: 49000, includedWeightKg: 5, depositPinCode: '654321' })
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
  await expect(page.getByText('Occupied compartment information is being updated. Choose Available to continue.')).toBeVisible()
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
  await page.getByRole('textbox', { name: 'Order note (optional)' }).fill('Care for colours')
  await page.getByLabel('Promotion code', { exact: true }).fill('BAD')
  await expect(page.getByRole('button', { name: 'Confirm order', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Apply / Update price', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('The promotion code does not exist.')
  await page.getByRole('button', { name: 'Remove promotion code', exact: true }).click()
  await page.getByRole('button', { name: /SAVE5/ }).click()
  await expect(page.getByText('Code SAVE5 applied')).toBeVisible()
  await page.getByRole('button', { name: 'Change language', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  await expect(page.getByRole('textbox', { name: /Ghi chú cho đơn hàng/ })).toHaveValue('Care for colours')
  await expect(page.getByText('Đã áp dụng mã SAVE5')).toBeVisible()
  await page.getByRole('button', { name: 'Xác nhận tạo đơn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tạo đơn thành công!' })).toBeVisible()
  expect(state.creates).toHaveLength(1)
  expect(state.creates[0]).toEqual({ lockerId: locker.id, boxId: slots[0].id, returnLockerId: locker.id, paymentMethod: 1, customerNote: 'Care for colours', promotionCode: 'SAVE5', items: [{ serviceId: 'iron', quantity: 2 }, { serviceId: 'wash', quantity: 1 }] })
  await expect(page.getByText('654321', { exact: true })).toHaveCount(0)
  const persisted = await page.evaluate(() => localStorage.getItem('persist:root'))
  expect(persisted).not.toContain('654321')
  expect(persisted).not.toContain('Care for colours')
  const success = page.locator('section[aria-labelledby="order-success-title"]')
  await expect(success.locator('..')).toHaveCSS('opacity', '1')
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

test('new order navigation is active and reloading starts a fresh draft', async ({ page }) => {
  const state = await setup(page)
  await expect(page.locator('header').getByRole('link', { name: 'Create an order', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Select Everyday wash', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Selected services (0)' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  expect(state.creates).toHaveLength(0)
})

test('whole service cards and lockers keep a pale blue surface for hover and selection', async ({ page }) => {
  await setup(page)
  const wash = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Everyday wash', exact: true }) })
  const ironing = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Shirt ironing', exact: true }) })
  const themeColors = () => page.evaluate(() => {
    const reference = document.createElement('div')
    reference.style.backgroundColor = 'var(--color-blue-50)'
    reference.style.color = 'var(--color-slate-900)'
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
