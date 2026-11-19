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
    if (path === '/customer/service-categories') {
      return paged([{ id: 'ca000000-0000-0000-0000-000000000006', code: 'SPECIAL', name: 'Special care', isActive: true }])
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

test.describe('Customer touch appearance controls', () => {
  test.use({ hasTouch: true, isMobile: true })

  test('mobile menu labels preferences, changes theme before the next frame and has larger guest actions', async ({ page }) => {
    await setup(page)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
    const drawer = page.getByRole('dialog', { name: 'Mobile navigation', exact: true })
    await expect(drawer.getByText('Language:', { exact: true })).toBeVisible()
    await expect(drawer.getByText('Appearance:', { exact: true })).toBeVisible()
    for (const dark of [true, false]) {
      const toggle = drawer.getByRole('button', { name: dark ? 'Switch to dark mode' : 'Switch to light mode', exact: true })
      await toggle.evaluate(element => element.addEventListener('click', () => {
        window.customerThemePaint = new Promise(resolve => requestAnimationFrame(() => resolve({
          dark: document.documentElement.classList.contains('dark'),
          scheme: document.documentElement.style.colorScheme,
          background: getComputedStyle(element).backgroundColor,
          drawerBackground: getComputedStyle(element.closest('[role="dialog"]')).backgroundColor,
          transition: getComputedStyle(element).transitionProperty
        })))
      }, { once: true }))
      await toggle.tap()
      const paint = await page.evaluate(() => window.customerThemePaint)
      expect(paint).toMatchObject({ dark, scheme: dark ? 'dark' : 'light', transition: 'none' })
      expect(paint.background).toBe(paint.drawerBackground)
      await expect(drawer).toBeVisible()
    }
    for (const name of ['Sign in', 'Register']) {
      const action = drawer.getByRole('button', { name, exact: true })
      expect((await action.boundingBox()).height).toBeGreaterThanOrEqual(48)
      await expect(action).toBeInViewport()
    }
    const menuBounds = await drawer.boundingBox()
    expect(menuBounds.width).toBe(272)
    expect(menuBounds.height).toBe(844)
    await page.setViewportSize({ width: 390, height: 480 })
    await expect(drawer.getByRole('button', { name: 'Register', exact: true })).toBeInViewport()
    expect((await drawer.boundingBox()).height).toBeLessThanOrEqual(480)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})

test('Customer header scroll progress follows the page in both themes and resets on navigation', async ({ page }) => {
  await setup(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Guest laundry', exact: true })).toBeVisible()
  const track = page.locator('[data-customer-scroll-progress]')
  const fill = track.locator('div')
  const progress = () => fill.evaluate(el => new DOMMatrixReadOnly(getComputedStyle(el).transform).a)
  const colors = []
  for (const dark of [false, true]) {
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await expect.poll(progress).toBeLessThan(0.01)
    await page.evaluate(() => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) / 2, behavior: 'instant' }))
    await expect.poll(progress).toBeGreaterThan(0.45)
    await expect.poll(progress).toBeLessThan(0.55)
    const header = await page.locator('header').boundingBox()
    const bar = await track.boundingBox()
    expect(bar.y).toBeCloseTo(header.y, 0)
    colors.push(await fill.evaluate(el => getComputedStyle(el).backgroundColor))
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
    await expect.poll(progress).toBeGreaterThan(0.99)
  }
  expect(colors[0]).not.toBe(colors[1])
  await page.goto('/services')
  await expect(page.locator('#services article')).toBeVisible()
  await expect.poll(progress).toBeLessThan(0.01)
})

test('guests land on Home and can search, filter and read catalog without private requests', async ({ page }) => {
  const requests = await setup(page)
  await page.goto('/')
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Guest laundry', exact: true })).toBeVisible({ timeout: 20000 })
  await expect(page.locator('header').getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.locator('header').getByRole('button', { name: 'Register', exact: true })).toBeVisible()
  await expect(page.locator('main').getByRole('button', { name: 'Register', exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'What customers say about WashGo', exact: true })).toBeVisible()
  await page.goto('/services')
  await page.getByRole('checkbox', { name: 'Special care', exact: true }).click()
  await expect(page).toHaveURL(/categoryId=ca000000-0000-0000-0000-000000000006/)
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
  const mobileHeader = page.locator('header').first()
  await expect(mobileHeader.getByRole('button', { name: 'Change language', exact: true })).toBeHidden()
  await expect(mobileHeader.getByRole('button', { name: /Switch to .* mode/ })).toBeHidden()
  const menuPosition = await mobileHeader.getByRole('button', { name: 'Open navigation menu', exact: true }).boundingBox()
  const logoPosition = await mobileHeader.getByRole('link', { name: 'WashGo - Home', exact: true }).boundingBox()
  expect(menuPosition.x + menuPosition.width).toBeLessThanOrEqual(logoPosition.x)
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Mobile navigation', exact: true })
  await expect(drawer.getByRole('button', { name: 'Register', exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Change language', exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: /Switch to .* mode/ })).toBeVisible()
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

test('Home hero automatically cycles seven decoded photos without controls and respects reduced motion', async ({ page }) => {
  await setup(page)
  await page.clock.install()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const nextPhotos = ['hero-pickup', 'hero-courier', 'hero-riding', 'hero-handoff', 'hero-sorting', 'hero-folding', 'locker-community-hero']
  const loaded = nextPhotos.map(name => page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname.endsWith(`/${name}.png`) && !url.searchParams.has('import')
  }).then(response => response.finished()))
  await page.goto('/')
  const hero = page.locator('section[aria-labelledby="home-hero-heading"]')
  const active = hero.locator('[data-hero-active-photo]')
  await expect(active).toHaveAttribute('data-hero-active-photo', '0')
  for (const [index, ready] of loaded.entries()) {
    await ready
    await page.clock.fastForward(4100)
    await expect(active).toHaveAttribute('data-hero-active-photo', String((index + 1) % 7))
    expect(await active.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
    if (index === 6) {
      expect(await active.evaluate(image => Number(getComputedStyle(image.parentElement).opacity))).toBeLessThan(1)
    }
  }
  await expect(hero.getByRole('button')).toHaveCount(2)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.fastForward(18000)
  await expect(active).toHaveAttribute('data-hero-active-photo', '0')
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
  await expect(hero.locator('[data-hero-active-photo]')).toHaveAttribute('alt', '')
  await expect.poll(() => hero.locator('[data-hero-active-photo]').evaluate(image => image.naturalWidth)).toBeGreaterThan(0)
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
    const image = await hero.locator('[data-hero-active-photo]').boundingBox()
    const heading = await hero.getByRole('heading', { level: 1 }).boundingBox()
    expect(image.width).toBeCloseTo(width, 0)
    expect(heading.y).toBeLessThan(image.y + image.height)
    expect(heading.y + heading.height).toBeGreaterThan(image.y)
    await expect(hero.locator('[data-hero-active-photo]')).toHaveCSS('object-fit', 'contain')
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
    await page.goto('/')
    await page.getByRole('button', { name: 'Change language', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Tiếng Việt', exact: true }).click()
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('#home-hero-heading')).toHaveCSS('font-family', '"Lora Hero", serif')
    await page.screenshot({ path: 'test-results/home-hero-vietnamese-desktop.png', animations: 'disabled' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'test-results/home-hero-vietnamese-mobile.png', animations: 'disabled' })
  }
})

test('standalone locker map and list remain usable after sliding in and fit mobile', async ({ page }) => {
  await setup(page)
  await page.route(/\/api\/customer\/lockers(?:\?|$)/, route => route.fulfill({ json: {
    succeeded: true, currentPage: 1, totalPages: 1, total: 1,
    list: [{ ...locker, latitude: 10.7769, longitude: 106.7009 }]
  } }))
  await page.route('https://tile.openstreetmap.de/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" />' }))
  await page.goto('/lockers')
  const select = page.getByRole('button', { name: 'Show on map', exact: true })
  await select.click()
  await expect(select).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('region', { name: 'Locker location map', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 375, height: 900 })
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
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
        await expect(card.locator('h3')).toHaveCSS('white-space', 'nowrap')
        await expect(card.locator('h3')).toHaveCSS('text-overflow', 'ellipsis')
        await expect(card.getByText(catalog[0].description, { exact: true })).toHaveCSS('-webkit-line-clamp', '2')
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
