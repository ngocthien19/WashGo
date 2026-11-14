import { test, expect } from '@playwright/test'
import { seedSeenTerms } from '../helpers/serviceTerms'

const initialProfile = {
  id: '11111111-1111-1111-1111-111111111111', fullName: 'Alex Nguyen', email: 'alex@example.test',
  phone: '0901234567', avatarUrl: null, address: '123 Le Loi', district: 'Quan 1', city: 'TP. Ho Chi Minh',
  loyaltyPoints: 120, totalOrders: 12, totalSpent: 450000
}
const uploadedUrl = '/uploads/11111111111111111111111111111111/22222222222222222222222222222222.png'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64')
const envelope = (data) => ({ succeeded: true, statusCode: 200, data })

const mockCustomer = async (page, options = {}) => {
  await seedSeenTerms(page, initialProfile.id)
  const state = {
    profile: { ...initialProfile, ...options.profile },
    getFailures: options.getFailures || 0, putFailures: options.putFailures || 0,
    bodies: [], uploadCount: 0, uploadHeaders: null, uploadBody: null, authorization: []
  }
  await page.route('https://accounts.google.com/**', (route) => route.abort())
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^\/api/, '')
    const identity = { id: state.profile.id, role: 'Customer', email: state.profile.email, fullName: state.profile.fullName, avatar: state.profile.avatarUrl }
    let json
    if (path.startsWith('/uploads/')) {
      await route.fulfill({ contentType: 'image/png', body: png })
      return
    }
    if (path === '/auth/login') {
      json = envelope({ user: identity, accessToken: 'test-access', refreshToken: 'test-refresh', expiresAt: '2099-01-01T00:00:00Z' })
    } else if (path === '/auth/me') {
      json = envelope(identity)
    } else if (path === '/customer/me') {
      state.authorization.push(request.headers().authorization)
      if (request.method() === 'GET' && state.getFailures-- > 0) {
        await route.fulfill({ status: 500, json: { succeeded: false, message: 'customer.profile.requestError' } })
        return
      }
      if (request.method() === 'PUT') {
        const body = request.postDataJSON()
        state.bodies.push(body)
        if (state.putFailures-- > 0) {
          await route.fulfill({ status: 400, json: { succeeded: false, message: 'customer.profile.requestError' } })
          return
        }
        const { avatarUrl, ...values } = body
        state.profile = { ...state.profile, ...values, avatarUrl: avatarUrl === null ? state.profile.avatarUrl : avatarUrl || null }
      }
      json = envelope(state.profile)
    } else if (path === '/files/images') {
      state.uploadCount += 1
      state.uploadHeaders = request.headers()
      state.uploadBody = request.postDataBuffer().toString('latin1')
      json = envelope({ url: uploadedUrl, size: png.length, contentType: 'image/png' })
    } else if (path === '/customer/services/filter' || path === '/customer/lockers') {
      json = { succeeded: true, list: [], total: 0, currentPage: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false }
    } else {
      await route.fulfill({ status: 404, json: { succeeded: false } })
      return
    }
    await route.fulfill({ json })
  })
  return state
}

const signIn = async (page) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Đổi ngôn ngữ', exact: true }).click()
  await page.getByRole('menuitem', { name: 'English', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill(initialProfile.email)
  await page.getByLabel('Password', { exact: true }).fill('TestPassword123')
  await page.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/customer')
}

const mapAddress = {
  housenumber: '123', street: 'Lê Lợi', district: 'Phường Bến Thành',
  county: 'Quận 1', city: 'Thành phố Hồ Chí Minh', state: 'Thành phố Hồ Chí Minh'
}
const geocodingResult = (properties) => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties }] })
const mockMapTiles = (page) => page.route('https://tile.openstreetmap.de/**', (route) => route.fulfill({
  contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><path fill="#e6edf4" d="M0 0h256v256H0z"/><path stroke="white" stroke-width="12" d="M0 72h256M64 0v256M200 0v256"/></svg>'
}))

test('profile requires phone, address and city before upload or save', async ({ page }) => {
  const state = await mockCustomer(page, { profile: { phone: '', address: '', city: '', avatarUrl: uploadedUrl } })
  await signIn(page)
  await page.goto('/customer/profile')
  const form = page.getByRole('form', { name: 'Personal information', exact: true })
  await form.getByLabel('Full name', { exact: true }).fill('Alex Updated')
  await form.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(form.getByText('Please enter your phone number.', { exact: true })).toBeVisible()
  await expect(form.getByText('Please enter your address.', { exact: true })).toBeVisible()
  await expect(form.getByText('Please enter your province/city.', { exact: true })).toBeVisible()
  await form.getByLabel('Phone number', { exact: true }).fill('1901234567')
  await form.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(form.getByText('A phone number is required: 10 digits starting with 0.', { exact: true })).toBeVisible()
  expect(state.bodies).toHaveLength(0)
  expect(state.uploadCount).toBe(0)
})

test('post-merger boundaries replace a stale province and omit legacy districts', async ({ page, context }) => {
  const state = await mockCustomer(page)
  await mockMapTiles(page)
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 10.91, longitude: 106.77 })
  const boundaryRequests = []
  page.on('request', (request) => {
    if (request.url().includes('/customer/provinces/')) {
      boundaryRequests.push(request)
    }
  })
  await page.route('**/reverse?**', (route) => route.fulfill({ json: geocodingResult({
    street: 'Đường A', district: 'Phường Dĩ An', state: 'Tỉnh Bình Dương', city: 'Dĩ An', county: 'Dĩ An', countrycode: 'VN'
  }) }))
  await signIn(page)
  await page.goto('/customer/profile')
  await page.getByRole('button', { name: 'Choose on map', exact: true }).click()
  const dialog = page.getByRole('dialog')
  expect(boundaryRequests).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Use my location', exact: true }).click()
  await expect(dialog.getByText('Thành phố Hồ Chí Minh', { exact: true })).toBeVisible()
  await expect(dialog.getByText(/checked against post-merger boundaries/)).toBeVisible()
  await expect(dialog.getByText('District', { exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Apply address', exact: true }).click()
  await expect(page.locator('#district')).toHaveCount(0)
  await expect(page.locator('#city')).toHaveValue('Thành phố Hồ Chí Minh')
  await expect(page.locator('#address')).toHaveValue('Đường A, Phường Dĩ An')
  expect(state.bodies).toHaveLength(0)
  expect(boundaryRequests).toHaveLength(1)
  expect(boundaryRequests.every((request) => !request.headers().authorization && !request.url().includes('?'))).toBe(true)
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('Profile updated successfully!', { exact: true })).toBeVisible()
  expect(state.bodies.at(-1)).not.toHaveProperty('district')
  expect(state.bodies.at(-1)).not.toHaveProperty('boundaryStatus')
})

test('a failed current province download is explained and can retry without losing the point', async ({ page }) => {
  await mockCustomer(page)
  await mockMapTiles(page)
  let failures = 1
  await page.route('**/customer/provinces/boundaries.json', async (route) => {
    if (failures-- > 0) {
      return route.fulfill({ status: 503, body: '' })
    }
    return route.continue()
  })
  await page.route('**/reverse?**', (route) => route.fulfill({ json: geocodingResult({
    street: 'Lê Thánh Tôn', district: 'Sài Gòn', city: 'Thành phố Hồ Chí Minh', countrycode: 'VN'
  }) }))
  await signIn(page)
  await page.goto('/customer/profile')
  await page.getByRole('button', { name: 'Choose on map', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Choose map center', exact: true }).click()
  await expect(dialog.getByText(/Current province boundaries could not be loaded/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(dialog.getByText(/checked against post-merger boundaries/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Apply address', exact: true }).click()
  await expect(page.locator('#city')).toHaveValue('Thành phố Hồ Chí Minh')
})

test('map address selection previews, cancels and applies fields without saving automatically', async ({ page }) => {
  const state = await mockCustomer(page)
  await mockMapTiles(page)
  const requests = []
  await page.route('**/reverse?**', (route) => {
    requests.push(route.request())
    return route.fulfill({ json: geocodingResult(mapAddress) })
  })
  await signIn(page)
  await page.goto('/customer/profile')
  const open = page.getByRole('button', { name: 'Choose on map', exact: true })
  await open.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Apply address', exact: true })).toBeDisabled()
  expect(requests).toHaveLength(0)
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(dialog.getByText('Selected location', { exact: true })).not.toBeVisible()
  expect(requests).toHaveLength(0)
  const center = dialog.getByRole('button', { name: 'Choose map center', exact: true })
  await center.focus()
  await page.keyboard.press('Enter')
  await expect(dialog.getByText('123 Lê Lợi, Phường Bến Thành', { exact: true })).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(page.locator('#address')).toHaveValue(initialProfile.address)
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('#address')).toHaveValue(initialProfile.address)
  await expect(open).toBeFocused()
  await open.click()
  await dialog.getByRole('button', { name: 'Choose map center', exact: true }).click()
  await expect(dialog.getByText('123 Lê Lợi, Phường Bến Thành', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Apply address', exact: true }).click()
  await expect(page.locator('#address')).toHaveValue('123 Lê Lợi, Phường Bến Thành')
  await expect(page.locator('#district')).toHaveCount(0)
  await expect(page.locator('#city')).toHaveValue('Thành phố Hồ Chí Minh')
  expect(state.bodies).toHaveLength(0)
  expect(requests).toHaveLength(1)
  expect(requests[0].headers().authorization).toBeUndefined()
  expect([...new URL(requests[0].url()).searchParams.keys()].sort()).toEqual(['lang', 'lat', 'limit', 'lon', 'radius'])
  await page.locator('#address').fill('125 Lê Lợi, Phường Bến Thành')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('Profile updated successfully!', { exact: true })).toBeVisible()
  expect(state.bodies.at(-1)).toEqual({
    fullName: initialProfile.fullName, phone: initialProfile.phone, avatarUrl: null,
    address: '125 Lê Lợi, Phường Bến Thành', city: 'Thành phố Hồ Chí Minh'
  })
})

test('map lookup errors can retry and incomplete results clear the old district', async ({ page }) => {
  const state = await mockCustomer(page)
  await mockMapTiles(page)
  let calls = 0
  await page.route('**/reverse?**', (route) => {
    calls += 1
    if (calls === 1) {
      return route.fulfill({ status: 503, json: {} })
    }
    return route.fulfill({ json: geocodingResult(calls === 2
      ? { type: 'city', name: 'Hà Nội', city: 'Hà Nội' }
      : { street: 'Đường mới', district: 'Phường mới', city: 'Hà Nội' }) })
  })
  await signIn(page)
  await page.goto('/customer/profile')
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  await page.getByRole('button', { name: 'Choose on map', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await page.mouse.move(0, 0)
  await expect(dialog.getByRole('button', { name: 'Choose map center', exact: true })).toHaveCSS('background-color', 'rgb(37, 37, 40)')
  await dialog.getByRole('button', { name: 'Choose map center', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Unable to find the address')
  await expect(dialog.getByRole('button', { name: 'Apply address', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('No detailed address found here')
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(dialog.getByText('Đường mới, Phường mới', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Unavailable — add it after applying', { exact: true })).toHaveCount(0)
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const bounds = await dialog.boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    expect(bounds.height).toBeLessThanOrEqual(900)
  }
  await page.setViewportSize({ width: 375, height: 900 })
  await dialog.getByRole('button', { name: 'Apply address', exact: true }).click()
  await expect(page.locator('#district')).toHaveCount(0)
  await expect(page.locator('#city')).toHaveValue('Hà Nội')
  expect(state.bodies).toHaveLength(0)
})

test('the newest map point wins over a slower previous lookup', async ({ page }) => {
  await mockCustomer(page)
  await mockMapTiles(page)
  let calls = 0
  let releaseFirst
  const firstPending = new Promise((resolve) => {
    releaseFirst = resolve
  })
  await page.route('**/reverse?**', async (route) => {
    calls += 1
    const first = calls === 1
    if (first) {
      await firstPending
    }
    await route.fulfill({ json: geocodingResult({ ...mapAddress, street: first ? 'Old street' : 'New street' }) }).catch(() => {})
  })
  try {
    await signIn(page)
    await page.goto('/customer/profile')
    await page.getByRole('button', { name: 'Choose on map', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Choose map center', exact: true }).click()
    await expect.poll(() => calls).toBe(1)
    await dialog.locator('.leaflet-container').click({ position: { x: 230, y: 130 } })
    await expect(dialog.getByText('123 New street, Phường Bến Thành', { exact: true })).toBeVisible()
    releaseFirst()
    await dialog.getByRole('button', { name: 'Apply address', exact: true }).click()
    await expect(page.locator('#address')).toHaveValue('123 New street, Phường Bến Thành')
  } finally {
    releaseFirst()
  }
})

test('map location lookup runs only after the customer asks for their location', async ({ page, context }) => {
  await mockCustomer(page)
  await mockMapTiles(page)
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 21.0285, longitude: 105.8542 })
  const requests = []
  await page.route('**/reverse?**', (route) => {
    requests.push(new URL(route.request().url()))
    return route.fulfill({ json: geocodingResult(mapAddress) })
  })
  await signIn(page)
  await page.goto('/customer/profile')
  const open = page.getByRole('button', { name: 'Choose on map', exact: true })
  await open.click()
  expect(requests).toHaveLength(0)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Use my location', exact: true }).click()
  await expect(dialog.getByText('123 Lê Lợi, Phường Bến Thành', { exact: true })).toBeVisible()
  expect(requests[0].searchParams.get('lat')).toBe('21.02850')
  expect(requests[0].searchParams.get('lon')).toBe('105.85420')
  await page.keyboard.press('Escape')
  await expect(open).toBeFocused()
  await expect(page.locator('#address')).toHaveValue(initialProfile.address)
})

test('customer edits profile, retries errors and saves an uploaded photo without losing edits', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const state = await mockCustomer(page, { getFailures: 1, putFailures: 1 })
  await signIn(page)
  await page.getByRole('button', { name: 'Open account menu', exact: true }).click()
  await expect(page.getByRole('menuitem')).toHaveText([
    'My profile', 'My orders', 'Manage complaints', 'All notifications', 'Sign out'
  ])
  await page.getByRole('menuitem', { name: 'My profile', exact: true }).click()
  await expect(page).toHaveURL('/customer/profile')
  await expect(page.getByRole('heading', { name: 'My profile', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Unable to load or update your profile')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  const form = page.getByRole('form', { name: 'Personal information', exact: true })
  await expect(form.getByLabel('Full name', { exact: true })).toHaveValue(initialProfile.fullName)
  await expect(form.getByLabel('Email', { exact: true })).toHaveAttribute('readonly')
  await expect(page.getByText('120', { exact: true })).toBeVisible()
  await form.getByLabel('Address', { exact: true }).fill('   ')
  await form.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(form.getByText('Please enter your address.', { exact: true })).toBeVisible()
  expect(state.bodies).toHaveLength(0)
  await form.getByLabel('Full name', { exact: true }).fill('Alex Updated')
  await form.getByLabel('Address', { exact: true }).fill('456 Nguyen Hue')
  await form.getByLabel('Phone number', { exact: true }).fill('0901234567')
  await page.getByLabel('Choose profile photo', { exact: true }).setInputFiles({ name: 'invalid.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(page.getByRole('alert')).toContainText('Only JPG, PNG or WEBP')
  expect(state.uploadCount).toBe(0)
  await page.getByLabel('Choose profile photo', { exact: true }).setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByRole('img', { name: 'Profile photo of Alex Nguyen', exact: true })).toHaveAttribute('src', /^blob:/)
  await form.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(form.getByRole('alert')).toContainText('Unable to load or update your profile')
  await expect(form.getByLabel('Full name', { exact: true })).toHaveValue('Alex Updated')
  await form.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('Profile updated successfully!', { exact: true })).toBeVisible()
  expect(state.uploadCount).toBe(1)
  expect(state.uploadHeaders['content-type']).toContain('multipart/form-data; boundary=')
  expect(state.uploadHeaders.authorization).toBe('Bearer test-access')
  expect(state.uploadBody).toContain('name="file"')
  expect(state.bodies.at(-1)).toEqual({
    fullName: 'Alex Updated', phone: '0901234567', address: '456 Nguyen Hue',
    city: initialProfile.city, avatarUrl: uploadedUrl
  })
  expect(state.authorization.every((header) => header === 'Bearer test-access')).toBe(true)
  await expect(page.locator('header').getByText('Alex Updated', { exact: true })).toBeVisible()
  await expect(page.locator('header img[src*="/api/uploads/"]')).toHaveCount(1)
  await page.reload()
  await expect(form.getByLabel('Full name', { exact: true })).toHaveValue('Alex Updated')
  await expect(form.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled()
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb', exact: true })
  await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('My profile')
  await page.setViewportSize({ width: 1440, height: 1100 })
  await breadcrumb.getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page).toHaveURL('/customer')
  for (const [path, label] of [['/customer/services', 'All services'], ['/customer/lockers', 'All lockers']]) {
    await page.goto(path)
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(label)
  }
  expect(errors).toEqual([])
})

test('customer discards edits, removes an avatar and can use the profile in both languages and themes', async ({ page }) => {
  const state = await mockCustomer(page, { profile: { avatarUrl: uploadedUrl } })
  await signIn(page)
  await page.goto('/customer/profile')
  const form = page.getByRole('form', { name: 'Personal information', exact: true })
  await form.getByLabel('Full name', { exact: true }).fill('Unsaved Name')
  await page.getByLabel('Choose profile photo', { exact: true }).setInputFiles({ name: 'invalid.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
  await expect(page.getByText('Only JPG, PNG or WEBP images are accepted.', { exact: true })).toBeVisible()
  await form.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(page.getByText('Only JPG, PNG or WEBP images are accepted.', { exact: true })).not.toBeVisible()
  await expect(form.getByLabel('Full name', { exact: true })).toHaveValue(initialProfile.fullName)
  expect(state.bodies).toHaveLength(0)
  await page.getByRole('button', { name: 'Remove profile photo', exact: true }).click()
  await form.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('Profile updated successfully!', { exact: true })).toBeVisible()
  expect(state.bodies.at(-1).avatarUrl).toBe('')
  await form.getByLabel('Full name', { exact: true }).fill('Language Test')
  await page.getByRole('button', { name: 'Change language', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
  await expect(page.getByLabel('Họ và tên', { exact: true })).toHaveValue('Language Test')
  await expect(page.getByRole('heading', { name: 'Hồ sơ của tôi', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Đổi ngôn ngữ', exact: true }).click()
  await page.getByRole('menuitem', { name: 'English', exact: true }).click()
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('guest cannot access customer profile', async ({ page }) => {
  let profileCalls = 0
  await page.route('**/api/customer/me', (route) => {
    profileCalls += 1
    return route.abort()
  })
  await page.goto('/customer/profile')
  await expect(page).toHaveURL('/login')
  expect(profileCalls).toBe(0)
})
