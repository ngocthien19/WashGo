import { test, expect } from '@playwright/test'
import { seedSeenTerms } from '../helpers/serviceTerms'

const user = { id: 'customer-test', fullName: 'Alex Nguyen', email: 'alex@example.test', role: 'Customer' }
const service = {
  id: 'service-test', name: 'Dịch vụ kiểm thử', code: 'SVC_TEST', serviceType: 2,
  unitPrice: 30000, unit: 'kg', estimatedDurationHours: 24,
  description: 'Mô tả đầy đủ từ API.'
}
const envelope = (data) => ({ succeeded: true, statusCode: 200, data })

test.beforeEach(async ({ page }) => {
  await seedSeenTerms(page, user.id)
  // No real accounts, mail, geolocation requests or backend writes during E2E.
  await page.route('https://accounts.google.com/**', (route) => route.abort())
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    let response
    if (path === '/auth/login') {
      response = envelope({ user, accessToken: 'test-access', refreshToken: 'test-refresh', expiresAt: '2099-01-01T00:00:00Z' })
    } else if (path === '/auth/me') {
      response = envelope(user)
    } else if (path === '/customer/services/service-test') {
      response = envelope(service)
    } else if (path === '/customer/services/filter' || path === '/customer/lockers') {
      const list = path.endsWith('/services/filter') ? [service] : []
      response = {
        succeeded: true, list, total: list.length, currentPage: 1,
        totalPages: 1, hasPreviousPage: false, hasNextPage: false
      }
    } else {
      await route.fulfill({ status: 404, json: { succeeded: false } })
      return
    }
    await route.fulfill({ json: response })
  })
})

const chooseEnglish = async (page) => {
  await page.getByRole('button', { name: 'Đổi ngôn ngữ', exact: true }).click()
  await page.getByRole('menuitem', { name: 'English', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
}

test('service checkboxes combine types and disjoint price ranges with sorting and removable badges', async ({ page }) => {
  const calls = []
  let fail = false
  await page.route('**/api/customer/services/filter', async (route) => {
    const body = route.request().postDataJSON()
    calls.push(body)
    expect(route.request().method()).toBe('POST')
    expect(body).not.toHaveProperty('serviceType')
    expect(body).not.toHaveProperty('minPrice')
    if (fail) {
      return route.fulfill({ status: 500, json: { succeeded: false, message: 'customer.unableToLoadDataPleaseTryAgain' } })
    }
    const list = Array.from({ length: 6 }, (_, index) => ({ ...service, id: `service-${body.page}-${index}`, name: `Service ${body.page}-${index}` }))
    return route.fulfill({ json: { succeeded: true, list, total: 12, currentPage: body.page, pageSize: body.take, totalPages: 2 } })
  })
  await page.goto('/login')
  await chooseEnglish(page)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('Password123')
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/customer')
  await page.goto('/customer/services?keyword=silk&serviceType=2&minPrice=30000&maxPrice=50000&sort=price-asc&page=2')
  await expect(page.getByRole('heading', { name: 'Service 2-0', exact: true })).toBeVisible()
  const dry = page.getByRole('checkbox', { name: 'Dry cleaning', exact: true })
  await expect(dry).toBeChecked()
  const typeToggle = page.getByRole('button', { name: 'Service type', exact: true })
  await typeToggle.click()
  await expect(dry).not.toBeVisible()
  await typeToggle.click()
  await expect(dry).toBeChecked()
  await page.getByRole('checkbox', { name: 'Ironing', exact: true }).click()
  await expect.poll(() => calls.at(-1).serviceTypes).toEqual([2, 3])
  await page.getByRole('checkbox', { name: /Over 100,000/, exact: false }).click()
  await expect.poll(() => calls.at(-1).priceRanges).toEqual([{ minPrice: 30000, maxPrice: 50000 }, { minPrice: 100000.01 }])
  expect(calls.at(-1).page).toBe(1)
  const badges = page.getByRole('group', { name: 'Active filters', exact: true })
  await expect(badges.getByRole('button', { name: /^Remove filter/ })).toHaveCount(5)
  const sort = page.getByRole('button', { name: 'Sort services', exact: true })
  await sort.click()
  await page.getByRole('menuitem', { name: 'Price: high to low', exact: true }).click()
  await expect.poll(() => calls.at(-1).sortBy[0]).toEqual({ field: 'UnitPrice', isDescending: true })
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect.poll(() => calls.at(-1).page).toBe(2)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Service 2-0', exact: true })).toBeVisible()
  await expect(dry).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Ironing', exact: true })).toBeChecked()
  await badges.getByRole('button', { name: 'Remove filter Dry cleaning', exact: true }).click()
  await expect.poll(() => calls.at(-1).serviceTypes).toEqual([3])
  await badges.getByRole('button', { name: /Remove filter Over 100,000/ }).click()
  await expect.poll(() => calls.at(-1).priceRanges).toEqual([{ minPrice: 30000, maxPrice: 50000 }])
  await page.goBack()
  await expect(page.getByRole('checkbox', { name: /Over 100,000/ })).toBeChecked()
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await badges.getByRole('button', { name: 'Clear all', exact: true }).click()
  await expect(badges).toHaveCount(0)
  await expect.poll(() => calls.at(-1)).toEqual({ page: 1, take: 6, serviceTypes: [], priceRanges: [], sortBy: [{ field: 'UnitPrice', isDescending: true }, { field: 'Name', isDescending: false }] })
  fail = true
  await page.getByRole('checkbox', { name: 'Dry cleaning', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Unable to load data')
  fail = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Service 1-0', exact: true })).toBeVisible()
})

test('password reset requires a verified token and sends it instead of the OTP', async ({ page }) => {
  let verificationAttempt = 0
  let resetBody
  await page.route('**/api/auth/send-otp', (route) => route.fulfill({ json: envelope(null) }))
  await page.route('**/api/auth/verify-otp', (route) => {
    verificationAttempt += 1
    return route.fulfill({ json: envelope({
      verified: verificationAttempt > 1,
      verificationToken: verificationAttempt > 2 ? 'test-verified-reset-token' : null
    }) })
  })
  await page.route('**/api/auth/reset-password', (route) => {
    resetBody = route.request().postDataJSON()
    return route.fulfill({ json: envelope(null) })
  })
  await page.goto('/forgot-password')
  await chooseEnglish(page)
  await page.getByLabel('Your email', { exact: true }).fill(user.email)
  await page.getByRole('button', { name: 'Send OTP', exact: true }).click()
  for (let digit = 1; digit <= 6; digit += 1) {
    await page.getByLabel(`OTP digit ${digit}`, { exact: true }).fill(String(digit))
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('The OTP is incorrect or has expired.')
  await expect(page).toHaveURL('/verify-otp')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('The system did not return a password reset verification token.')
  await expect(page).toHaveURL('/verify-otp')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL('/reset-password')
  await page.getByLabel('New password', { exact: true }).fill('TestPassword123')
  await page.getByLabel('Confirm new password', { exact: true }).fill('TestPassword123')
  await page.getByRole('button', { name: 'Save new password', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
  expect(resetBody).toEqual({
    email: user.email, verificationToken: 'test-verified-reset-token',
    newPassword: 'TestPassword123', confirmNewPassword: 'TestPassword123'
  })
})

test('locker sort and area selectors retain selected styling while hovered in both themes', async ({ page }) => {
  await page.route(/\/api\/customer\/lockers(?:\?|$)/, (route) => route.fulfill({
    json: {
      succeeded: true, currentPage: 1, totalPages: 1, total: 1,
      hasPreviousPage: false, hasNextPage: false,
      list: [{
        id: 'locker-test', code: 'LK_TEST', name: 'Locker test',
        city: 'TP. Hồ Chí Minh', district: 'Quận 1', address: '123 Lê Lợi',
        availableSlotCount: 2, latitude: null, longitude: null
      }]
    }
  }))
  await page.goto('/login')
  await chooseEnglish(page)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('Password123')
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/customer')
  await page.goto('/customer/lockers?district=legacy&page=2')
  await expect(page).toHaveURL('/customer/lockers')
  const sort = page.getByRole('button', { name: 'Sort lockers', exact: true })
  await sort.click()
  const selectedSort = page.getByRole('menuitem', { name: 'Name A–Z', exact: true })
  await expect(selectedSort).toHaveAttribute('aria-current', 'true')
  await selectedSort.hover()
  await expect(selectedSort).toHaveCSS('font-weight', '400')
  await expect(selectedSort).toHaveCSS('color', 'rgb(37, 99, 235)')
  await page.keyboard.press('Escape')
  const city = page.getByRole('combobox', { name: 'Province / City', exact: true })
  await expect(city).toBeEnabled()
  const search = page.getByRole('search', { name: 'Search lockers', exact: true })
  await expect(search.locator('..').locator('..').getByRole('combobox', { name: 'Province / City', exact: true })).toHaveCount(1)
  await expect(page.locator('form form')).toHaveCount(0)
  await city.click()
  await page.getByRole('option', { name: 'TP. Hồ Chí Minh', exact: true }).click()
  await city.click()
  const selectedCity = page.getByRole('option', { name: 'TP. Hồ Chí Minh', exact: true })
  await expect(selectedCity).toHaveAttribute('aria-selected', 'true')
  await selectedCity.hover()
  await expect(selectedCity).toHaveCSS('font-weight', '400')
  await expect(selectedCity).toHaveCSS('color', 'rgb(37, 99, 235)')
  await expect(city.locator('svg')).toHaveCSS('rotate', '180deg')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await city.click()
  await selectedCity.hover()
  await expect(selectedCity).toHaveCSS('color', 'rgb(96, 165, 250)')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('combobox', { name: 'District', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  const badges = page.getByRole('group', { name: 'Active filters', exact: true })
  await expect(badges.getByRole('button', { name: /^Remove filter/ })).toHaveCount(1)
  await expect(page.getByRole('search', { name: 'Search lockers', exact: true }).getByRole('button', { name: 'Sort lockers', exact: true })).toHaveCount(0)
  await badges.getByRole('button', { name: 'Remove filter TP. Hồ Chí Minh', exact: true }).click()
  await expect(badges).toHaveCount(0)
  await expect(city).toBeEnabled()
  await search.getByRole('combobox').fill('Locker test')
  await search.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/keyword=Locker\+test/)
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page).toHaveURL('/customer/lockers')
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(search).toBeVisible()
    await expect(city).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('language selection preserves form values, persists and shows the active language', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Password123')
  await chooseEnglish(page)
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('Password123')
  const trigger = page.getByRole('button', { name: 'Change language', exact: true })
  await expect(trigger).toHaveText('EN')
  await trigger.click()
  const selected = page.getByRole('menuitem', { name: 'English', exact: true })
  await expect(selected).toHaveAttribute('aria-current', 'true')
  await expect(selected).toHaveCSS('font-weight', '400')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(trigger.locator('svg')).toHaveCSS('rotate', '180deg')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(trigger).toHaveText('EN')
})

test('auth forms use readable 16px fields and descriptions without breaking responsive scrolling', async ({ page }) => {
  await page.goto('/login')
  await chooseEnglish(page)
  for (const [path, description] of [
    ['/login', 'Sign in to manage your orders and care for your clothes with ease.'],
    ['/register', 'Create an account to start your laundry journey with WashGo.']
  ]) {
    await page.goto(path)
    await expect(page.getByText(description, { exact: true })).toHaveCSS('font-size', '16px')
    for (const input of await page.locator('form input').all()) {
      await expect(input).toHaveCSS('font-size', '16px')
    }
    for (const label of await page.locator('form label').all()) {
      await expect(label).toHaveCSS('font-size', '16px')
    }
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      const submit = page.locator('form button[type=submit]')
      await submit.scrollIntoViewIfNeeded()
      await expect(submit).toBeInViewport()
      await expect(submit).toHaveCSS('font-size', '16px')
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await expect(page.locator('aside p')).toHaveCSS('font-size', '16px')
    await expect(page.locator('aside strong')).toHaveCSS('font-size', '16px')
    await expect(page.locator('aside small')).toHaveCSS('font-size', '16px')
  }
  await page.setViewportSize({ width: 1440, height: 900 })
})

test('home descriptions and locker actions use larger text and a primary location button', async ({ page }) => {
  await page.route(/\/api\/customer\/lockers(?:\?|$)/, (route) => route.fulfill({ json: {
    succeeded: true, currentPage: 1, totalPages: 1, total: 1,
    list: [{ id: 'locker-test', code: 'LK_TEST', name: 'Locker test', city: 'Test city', address: '123 Test Street', availableSlotCount: 2, latitude: null, longitude: null }]
  } }))
  await page.goto('/login')
  await chooseEnglish(page)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('Password123')
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/customer')
  for (const text of [
    'Choose the right care for every item. Consistent prices across our network.',
    'Find a convenient drop-off point. Use your location to see the nearest lockers.',
    'One less thing to worry about. More time for yourself.'
  ]) {
    await expect(page.getByText(text, { exact: true })).toHaveCSS('font-size', '16px')
  }
  for (const description of await page.locator('#how-it-works ol p').all()) {
    await expect(description).toHaveCSS('font-size', '16px')
  }
  const lockerSection = page.locator('#lockers')
  await expect(page.locator('footer h2').first()).toHaveCSS('font-size', '18px')
  await expect(page.locator('footer p').first()).toHaveCSS('font-size', '16px')
  await expect(page.locator('footer').getByRole('button', { name: 'Terms', exact: true })).toHaveCSS('font-size', '16px')
  const location = lockerSection.getByRole('button', { name: 'Use my location', exact: true })
  await expect(location).toHaveCSS('font-size', '16px')
  await expect(location).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  for (const name of ['Show on map', 'Details']) {
    const button = lockerSection.getByRole('button', { name, exact: true })
    await expect(button).toHaveCSS('font-size', '16px')
    expect((await button.boundingBox()).height).toBe(44)
    expect(parseFloat(await button.evaluate((element) => getComputedStyle(element).paddingLeft))).toBeGreaterThanOrEqual(16)
  }
  await page.setViewportSize({ width: 375, height: 844 })
  await lockerSection.getByRole('button', { name: 'Details', exact: true }).scrollIntoViewIfNeeded()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('customer service modal works in dark mode, with responsive layout and keyboard close', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/login')
  await chooseEnglish(page)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('Password123')
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/customer')
  await page.goto('/customer/services')
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(28, 28, 31)')
  await page.getByRole('button', { name: `View details for ${service.name}`, exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'View details', exact: true })).toBeVisible()
  await expect(dialog.getByRole('heading', { name: service.name, exact: true })).toBeVisible()
  await expect(dialog.getByText(service.description, { exact: true })).toBeVisible()
  await expect(dialog.getByText('SVC_TEST', { exact: true })).toBeVisible()
  await expect(dialog.getByText('24 hours', { exact: true })).toBeVisible()
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const bounds = await dialog.boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    expect(bounds.height).toBeLessThanOrEqual(900)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: `View details for ${service.name}`, exact: true })).toBeFocused()
  expect(errors).toEqual([])
})
