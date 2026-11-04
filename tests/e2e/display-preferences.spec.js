import { test, expect } from '@playwright/test'

const user = { id: 'customer-test', fullName: 'Alex Nguyen', email: 'alex@example.test', role: 'Customer' }
const service = {
  id: 'service-test', name: 'Dịch vụ kiểm thử', code: 'SVC_TEST', serviceType: 2,
  unitPrice: 30000, unit: 'kg', estimatedDurationHours: 24,
  description: 'Mô tả đầy đủ từ API.'
}
const envelope = (data) => ({ succeeded: true, statusCode: 200, data })

test.beforeEach(async ({ page }) => {
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
    } else if (path === '/customer/services' || path === '/customer/lockers') {
      const list = path.endsWith('/services') ? [service] : []
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
  await page.goto('/customer/lockers')
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
  const district = page.getByRole('combobox', { name: 'District', exact: true })
  await district.click()
  await page.getByRole('option', { name: 'Quận 1', exact: true }).click()
  await district.click()
  const selectedDistrict = page.getByRole('option', { name: 'Quận 1', exact: true })
  await expect(selectedDistrict).toHaveAttribute('aria-selected', 'true')
  await selectedDistrict.hover()
  await expect(selectedDistrict).toHaveCSS('font-weight', '400')
  await expect(selectedDistrict).toHaveCSS('color', 'rgb(96, 165, 250)')
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
