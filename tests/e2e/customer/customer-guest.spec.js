import { expect, test } from '@playwright/test'

const service = { id: 'guest-service', name: 'Guest laundry', code: 'WASH', unit: 'piece', unitPrice: 30000, serviceType: 1, imageUrls: [] }
const locker = { id: 'guest-locker', name: 'Guest locker', address: '123 Public Street', city: 'City', availableSlotCount: 1, slots: [{ id: 'slot', slotNumber: 1, size: 1, status: 1 }] }
const user = { id: 'guest-now-customer', role: 'Customer', fullName: 'Customer', email: 'guest@example.test' }
const policy = { terms: { version: 'v1', title: 'Terms', content: 'Public terms' }, rules: {}, accepted: true, requiresAcceptance: false }

async function setup(page, denied = false) {
  await page.addInitScript(() => localStorage.setItem('persist:root', JSON.stringify({ preferences: JSON.stringify({ language: 'en' }), _persist: JSON.stringify({ version: 1, rehydrated: true }) })))
  const requests = []
  await page.route('https://accounts.google.com/**', route => route.abort())
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, '')
    requests.push({ path, body: req.postData() ? req.postDataJSON() : null })
    const ok = data => route.fulfill({ json: { succeeded: true, data } })
    const paged = list => route.fulfill({ json: { succeeded: true, list, total: list.length, totalPages: 1, currentPage: 1 } })
    if (path === '/policy/current' || path === '/policy/customer') {
      return ok(policy)
    }
    if (path === '/auth/me') {
      return ok(user)
    }
    if (path === '/auth/login') {
      return ok({ user, accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresAt: '2099-01-01T00:00:00Z' })
    }
    if (path === '/auth/logout') {
      return ok(null)
    }
    if (path === '/customer/reviews') {
      return ok({ items: [], total: 0, page: 1, take: 4, hasMore: false })
    }
    if (path === '/customer/reviews/summary') {
      return ok({ total: 0, averageStars: null, distribution: [1, 2, 3, 4, 5].map(stars => ({ stars, count: 0, rate: 0 })) })
    }
    if (path === '/customer/services/filter' || path.startsWith('/customer/lockers')) {
      if (denied) {
        return route.fulfill({ status: 401, json: { succeeded: false } })
      }
      if (path === '/customer/lockers/guest-locker') {
        return ok(locker)
      }
      return paged(path.includes('services') ? [service] : [locker])
    }
    if (path === '/customer/services/guest-service') {
      return ok(service)
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return requests
}

test('guests land on Home and can search, filter and read catalog without private requests', async ({ page }) => {
  const requests = await setup(page)
  await page.goto('/')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Guest laundry', exact: true })).toBeVisible()
  await expect(page.locator('header').getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.locator('header').getByRole('button', { name: 'Register', exact: true })).toBeVisible()
  await expect(page.locator('main').getByRole('button', { name: 'Register', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'What customers say about WashGo', exact: true })).toBeVisible()
  await page.goto('/services')
  await page.getByRole('checkbox', { name: 'Standard wash', exact: true }).click()
  await expect(page).toHaveURL(/serviceType=1/)
  const search = page.getByRole('combobox').first()
  await search.fill('GUEST')
  await expect(page.getByRole('option', { name: /Guest laundry/ })).toBeVisible()
  await page.getByRole('option', { name: /Guest laundry/ }).click()
  await expect(page).toHaveURL(/keyword=Guest/)
  await page.getByRole('button', { name: 'View details for Guest laundry', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Guest laundry')
  await page.keyboard.press('Escape')
  await page.goto('/lockers')
  await expect(page.getByRole('heading', { name: 'Guest locker', exact: true })).toBeVisible()
  await expect(page.getByText('123 Public Street', { exact: false }).first()).toBeVisible()
  const lockerSearch = page.getByRole('combobox').first()
  await lockerSearch.fill('public')
  await page.getByRole('option', { name: /Guest locker/ }).click()
  await expect(page).toHaveURL(/keyword=Guest/)
  await page.getByRole('button', { name: 'Details', exact: true }).first().click()
  await expect(page.getByRole('dialog')).toContainText('Guest locker')
  await page.keyboard.press('Escape')
  expect(requests.some(r => /auth\/me|notification|chatbot|policy\/customer/.test(r.path))).toBe(false)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Mobile navigation', exact: true })
  await expect(drawer.getByRole('button', { name: 'Register', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('private customer actions redirect with a toast and return after signing in', async ({ page }) => {
  const requests = await setup(page)
  await page.goto('/')
  await page.locator('header').getByRole('link', { name: 'Create an order', exact: true }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByText('Please sign in to use this feature.', { exact: true })).toBeVisible()
  expect(requests.some(r => r.path.startsWith('/wash-order'))).toBe(false)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('TestPassword123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/orders/new')
  await page.getByRole('button', { name: 'Open account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('header').getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await page.locator('header').getByRole('link', { name: 'Create an order', exact: true }).click()
  await expect(page).toHaveURL('/login')
})

test('catalog authorization failures stay on the public page without opening private features', async ({ page }) => {
  await setup(page, true)
  await page.goto('/services?keyword=wash')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL('/services?keyword=wash')
  await expect(page.locator('header').getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
})

test('signing out on Home keeps the public Home visible', async ({ page }) => {
  await setup(page)
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill('TestPassword123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.getByRole('button', { name: 'Open account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('header').getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What customers say about WashGo', exact: true })).toBeVisible()
})

test('old customer URLs resolve to clean URLs and auth logos lead to the root Home', async ({ page }) => {
  await setup(page)
  await page.goto('/customer/services?keyword=wash#services')
  await expect(page).toHaveURL('/services?keyword=wash#services')
  for (const path of ['/login', '/register', '/forgot-password']) {
    await page.goto(path)
    await page.getByRole('link', { name: 'WashGo - Home', exact: true }).filter({ visible: true }).first().click()
    await expect(page).toHaveURL('/')
  }
})

test('Home layers readable content over its image and services are visible before scrolling', async ({ page }) => {
  await setup(page)
  await page.route('**/api/customer/services/filter', route => route.fulfill({ json: {
    succeeded: true, currentPage: 1, totalPages: 1, total: 4,
    list: Array.from({ length: 4 }, (_, index) => ({ ...service, id: `guest-service-${index}`, name: `Guest laundry ${index + 1}` }))
  } }))
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  const hero = page.locator('section[aria-labelledby="home-hero-heading"]')
  expect((await hero.boundingBox()).height).toBeGreaterThanOrEqual(875)
  await expect(hero.getByRole('heading', { level: 1 })).toBeVisible()
  const explore = hero.getByRole('button', { name: 'Explore services', exact: true })
  await explore.hover()
  await expect(explore).toHaveCSS('transform', 'none')
  await expect(hero.locator('img')).toHaveAttribute('alt', '')
  await expect.poll(() => hero.locator('img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0)
  const cards = page.locator('#services article')
  await expect(cards).toHaveCount(4)
  for (const card of await cards.all()) {
    await expect(card).toHaveCSS('opacity', '1')
    await expect(card).toHaveCSS('transform', 'none')
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  if (process.env.HOME_HERO_QA) {
    await page.screenshot({ path: 'test-results/home-hero-light.png', animations: 'disabled' })
  }
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click()
  if (process.env.HOME_HERO_QA) {
    await page.screenshot({ path: 'test-results/home-hero-dark.png', animations: 'disabled' })
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await expect(hero.getByRole('button', { name: 'Explore services', exact: true })).toBeVisible()
  }
  if (process.env.HOME_HERO_QA) {
    await page.screenshot({ path: 'test-results/home-hero-mobile.png', animations: 'disabled' })
  }
  await hero.getByRole('button', { name: 'Explore services', exact: true }).click()
  await expect(page).toHaveURL('/#services')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await cards.first().getByRole('button', { name: 'View details for Guest laundry 1', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.goto('/#how-it-works')
  const steps = page.locator('#how-it-works')
  await expect.poll(() => steps.locator('img').evaluate(image => image.naturalWidth)).toBeGreaterThan(0)
  await expect(steps.locator('ol li')).toHaveCount(4)
  await expect(steps.locator('ol li').first()).toHaveCSS('opacity', '1')
  if (process.env.HOME_HERO_QA) {
    await page.setViewportSize({ width: 1440, height: 960 })
    for (const step of await steps.locator('ol li').all()) {
      await expect(step).toHaveCSS('opacity', '1')
    }
    await steps.screenshot({ path: 'test-results/home-steps-dark.png' })
    await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click()
    await steps.screenshot({ path: 'test-results/home-steps-light.png' })
  }
})

test('Home locker map and list remain usable after their slide-in animation', async ({ page }) => {
  await setup(page)
  await page.route(/\/api\/customer\/lockers(?:\?|$)/, route => route.fulfill({ json: {
    succeeded: true, currentPage: 1, totalPages: 1, total: 1,
    list: [{ ...locker, latitude: 10.7769, longitude: 106.7009 }]
  } }))
  await page.route(/https:\/\/[^/]*tile\.openstreetmap\.org\//, route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMC/wCfyO0AAAAASUVORK5CYII=', 'base64') }))
  await page.goto('/')
  const section = page.locator('#lockers')
  await section.scrollIntoViewIfNeeded()
  await expect(section.getByRole('region', { name: 'Locker location map', exact: true })).toBeVisible()
  const select = section.getByRole('button', { name: 'Show on map', exact: true })
  await select.click()
  await expect(select).toHaveAttribute('aria-pressed', 'true')
  await expect(select).toHaveCSS('transform', 'none')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
})

test('service cards stay compact with square images and usable actions on narrow screens', async ({ page }) => {
  await setup(page)
  const catalog = Array.from({ length: 4 }, (_, index) => ({ ...service,
    id: index ? `service-${index}` : service.id,
    name: index ? `Guest laundry ${index + 1}` : 'Premium laundry and delicate fabric care with a longer service name',
    description: 'Careful washing, drying and folding for everyday clothes and delicate fabrics.',
    unit: index ? 'piece' : 'large laundry bag', unitPrice: index ? 30000 : 129000000
  }))
  await page.route('**/api/customer/services/filter', route => route.fulfill({ json: {
    succeeded: true, currentPage: 1, totalPages: 1, total: catalog.length, list: catalog
  } }))
  for (const path of ['/', '/services']) {
    await page.goto(path)
    const cards = page.locator('#services article')
    await expect(cards).toHaveCount(4)
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      for (const card of await cards.all()) {
        await expect(card).toHaveCSS('transform', 'none')
      }
      const first = await cards.first().boundingBox()
      const second = await cards.nth(1).boundingBox()
      expect(first.width).toBeLessThanOrEqual(272)
      if (width < 400) {
        expect(first.width).toBeLessThan(185)
        expect(first.y).toBeCloseTo(second.y, 0)
      }
      for (const card of await cards.all()) {
        const image = await card.locator('.aspect-square').boundingBox()
        expect(Math.abs(image.width - image.height)).toBeLessThan(1)
        const action = await card.getByRole('button').boundingBox()
        expect(action.width).toBeGreaterThanOrEqual(44)
        expect(action.height).toBeGreaterThanOrEqual(44)
      }
      if (process.env.SERVICE_CARD_QA && [390, 1440].includes(width)) {
        await cards.first().locator('..').screenshot({ path: `test-results/service-cards-${path === '/' ? 'home' : 'catalog'}-${width}.png` })
      }
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await cards.first().getByRole('button').click()
    await expect(page.getByRole('dialog')).toContainText('Guest laundry')
    await page.keyboard.press('Escape')
  }
})
