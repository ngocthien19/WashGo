import { test, expect } from '@playwright/test'

const conversation = '11111111-1111-4111-8111-111111111111'
const service = '22222222-2222-4222-8222-222222222222'
const avatar = '/uploads/chat-avatar.png'
const envelope = (data) => ({ succeeded: true, data, statusCode: 200 })
const cursorPage = (items, nextCursor = null) => envelope({ items, hasMore: !!nextCursor, nextCursor })

async function setup(page, options = {}) {
  const state = { sends: [], lookups: 0, lists: 0, deletes: [], messageLoads: [], fail: options.fail, abort: options.abort, processing: options.processing }
  await page.addInitScript(({ dark, avatar }) => {
    localStorage.setItem('persist:root', JSON.stringify({
      auth: JSON.stringify({ user: { id: 'chat-customer', fullName: 'Chat Customer', role: 'Customer', avatar }, accessToken: 'fixture-token', refreshToken: 'fixture-refresh', expiresAt: '2099-01-01T00:00:00Z' }),
      preferences: JSON.stringify({ language: 'en', serviceTermsSeen: { 'chat-customer': true } }),
      theme: JSON.stringify({ mode: dark ? 'dark' : 'light' }), _persist: JSON.stringify({ version: 1, rehydrated: true })
    }))
  }, { dark: !!options.dark, avatar })
  const turn = (payload, status = 2) => ({
    conversationId: conversation, messageId: 'customer-message', requestId: payload.requestId, status,
    answer: status === 2 ? '<img src=x onerror=alert(1)> Safe answer' : null,
    errorCode: status === 3 ? options.errorCode || 'AiUnavailable' : null, serverNow: '2026-11-13T12:00:00Z',
    sources: [{ code: 'service-catalog', title: 'Service catalog', version: '2026-11-13-v1', retrievedAt: '2026-11-13T12:00:00Z' }],
    cards: status === 2 ? [{ type: 'Service', id: service, title: 'Fixture laundry', data: { unitPrice: 35000, unit: 'kg' } }, { type: 'Link', id: 'https://evil.test', title: 'Do not render' }] : []
  })
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    if (path === avatar) {
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMC/wCfyO0AAAAASUVORK5CYII=', 'base64') })
    }
    if (path === '/auth/me') {
      return route.fulfill({ json: envelope({ id: 'chat-customer', fullName: 'Chat Customer', role: 'Customer', avatar }) })
    }
    if (path === '/policy/customer') {
      return route.fulfill({ json: envelope({ terms: { version: 'v1', title: 'Terms', content: 'Fixture terms' }, rules: {}, requiresAcceptance: false, accepted: true }) })
    }
    if (path === '/customer/chatbot/conversations') {
      state.lists += 1
      return route.fulfill({ json: options.history
        ? cursorPage(url.searchParams.has('cursor') ? [{ id: 'older-conversation', title: 'Older conversation' }] : [{ id: conversation, title: 'Existing conversation' }], url.searchParams.has('cursor') ? null : 'signed+/=')
        : cursorPage([]) })
    }
    if (path.endsWith('/messages') && request.method() === 'GET') {
      state.messageLoads.push(url.searchParams.get('cursor'))
      const older = url.searchParams.has('cursor')
      return route.fulfill({ json: cursorPage(Array.from({ length: 12 }, (_, index) => ({ id: `${older ? 'old' : 'recent'}-${index}`, role: index % 2 ? 2 : 1,
        content: `${older ? 'Old' : 'Recent'} message ${index}. Enough content to exercise vertical scrolling in the chat panel.`, status: 2 })), older ? null : 'older-messages') })
    }
    if (path.startsWith('/customer/chatbot/conversations/') && request.method() === 'DELETE') {
      state.deletes.push(path)
      return route.fulfill({ json: envelope(null) })
    }
    if (path.includes('/requests/')) {
      state.lookups += 1
      return route.fulfill({ json: envelope(turn(state.sends.at(-1).body)) })
    }
    if (path.startsWith('/customer/chatbot/') && request.method() === 'POST') {
      const body = request.postDataJSON()
      state.sends.push({ body, path, authorization: request.headers().authorization })
      if (state.abort) {
        state.abort = false
        return route.abort('connectionfailed')
      }
      if (state.fail) {
        state.fail = false
        return route.fulfill({ status: 503, json: { ...envelope(turn(body, 3)), succeeded: false, statusCode: 503 } })
      }
      return route.fulfill({ status: state.processing ? 202 : 200, json: envelope(turn(body, state.processing ? 1 : 2)) })
    }
    if (path === `/customer/services/${service}`) {
      return route.fulfill({ json: envelope({ id: service, name: 'Fixture laundry', unit: 'kg', unitPrice: 35000, serviceType: 1, description: 'Laundry details', estimatedDurationHours: 12, imageUrls: [] }) })
    }
    if (path.includes('/customer/services/filter') || path === '/customer/lockers') {
      return route.fulfill({ json: { succeeded: true, list: [], total: 0, currentPage: 1, totalPages: 1 } })
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  await page.goto('/customer')
  await expect(page.getByRole('button', { name: 'Open WashGo assistant', exact: true })).toBeVisible()
  return state
}
const openChat = (page) => page.getByRole('button', { name: 'Open WashGo assistant', exact: true }).click()
const question = (page) => page.getByRole('textbox', { name: 'Question for WashGo', exact: true })

test('shared launcher stays across Customer navigation; answers are plain text and service details reuse the catalog modal', async ({ page }) => {
  const state = await setup(page)
  expect(state.lists).toBe(0)
  await openChat(page)
  expect(state.sends).toHaveLength(0)
  await question(page).fill('Service question')
  await question(page).press('Enter')
  await expect(page.getByText('<img src=x onerror=alert(1)> Safe answer', { exact: true })).toBeVisible()
  expect(state.sends).toHaveLength(1)
  expect(state.sends[0].authorization).toBe('Bearer fixture-token')
  expect(state.sends[0].body.context).toEqual({})
  if (process.env.CHATBOT_QA_SCREENSHOTS) {
    await page.screenshot({ path: 'test-results/chatbot-desktop.png' })
  }
  await expect(page.getByText('Do not render', { exact: true })).toHaveCount(0)
  await expect(page.locator('[data-chat-message] img[src="x"]')).toHaveCount(0)
  const customerMessage = page.locator('[data-chat-message]').filter({ hasText: 'Service question' })
  const customerAvatar = customerMessage.getByRole('img', { name: 'You', exact: true })
  await expect(customerAvatar).toHaveAttribute('src', /chat-avatar\.png/)
  const customerTextBox = await customerMessage.getByText('Service question', { exact: true }).boundingBox()
  expect((await customerAvatar.boundingBox()).x).toBeGreaterThan(customerTextBox.x + customerTextBox.width)
  const assistantMessage = page.locator('[data-chat-message]').filter({ hasText: '<img src=x onerror=alert(1)> Safe answer' })
  const robot = assistantMessage.getByRole('img', { name: 'WashGo assistant', exact: true })
  await expect(robot).toBeVisible()
  const assistantTextBox = await assistantMessage.getByText('<img src=x onerror=alert(1)> Safe answer', { exact: true }).boundingBox()
  expect((await robot.boundingBox()).x).toBeLessThan(assistantTextBox.x)
  await page.getByText('Sources and lookup time', { exact: true }).click()
  await expect(page.getByText(/^Service catalog ·/)).toBeVisible()
  await expect(page.getByText(/2026-11-13-v1/)).toHaveCount(0)
  await page.getByRole('button', { name: 'View details', exact: true }).click()
  await expect(page.getByText('Laundry details', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Close WashGo assistant', exact: true }).click()
  await page.locator('header a[href="/customer/services"]').first().click()
  await expect(page).toHaveURL(/\/customer\/services/)
  await openChat(page)
  await expect(page.getByText('<img src=x onerror=alert(1)> Safe answer', { exact: true })).toBeVisible()
  expect(state.sends).toHaveLength(1)
})

test('first-message timeout preserves the exact request across close/reopen, explicit recovery, and processing lookup', async ({ page }) => {
  const state = await setup(page, { abort: true })
  await openChat(page)
  await question(page).fill('Recover this question')
  await page.getByRole('button', { name: 'Send question', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Check using original request', exact: true })).toBeVisible()
  await expect(question(page)).toBeDisabled()
  await page.keyboard.press('Escape')
  await openChat(page)
  expect(state.sends).toHaveLength(1)
  state.processing = true
  await page.getByRole('button', { name: 'Check using original request', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Check result', exact: true })).toBeVisible()
  expect(state.sends[1]).toEqual(state.sends[0])
  await page.getByRole('button', { name: 'Check result', exact: true }).click()
  await expect(page.getByText('<img src=x onerror=alert(1)> Safe answer', { exact: true })).toBeVisible()
  expect(state.sends).toHaveLength(2)
  expect(state.lookups).toBe(1)
})

test('failed HTTP 503 keeps the conversation and retries only as an explicit new turn', async ({ page }) => {
  const state = await setup(page, { fail: true })
  await openChat(page)
  await question(page).fill('Try after failure')
  await question(page).press('Enter')
  await expect(page.getByRole('button', { name: 'Compose question again', exact: true })).toBeVisible()
  expect(state.sends).toHaveLength(1)
  await page.getByRole('button', { name: 'Compose question again', exact: true }).click()
  await expect(question(page)).toHaveValue('Try after failure')
  await question(page).press('Enter')
  await expect(page.getByText('<img src=x onerror=alert(1)> Safe answer', { exact: true })).toBeVisible()
  expect(state.sends[1].body.requestId).not.toBe(state.sends[0].body.requestId)
  expect(state.sends[1].path).toBe(`/customer/chatbot/conversations/${conversation}/messages`)
})

test('history cursors, older messages, and confirmation before deletion', async ({ page }) => {
  const state = await setup(page, { history: true, dark: true })
  await openChat(page)
  await page.getByRole('button', { name: 'Chat history', exact: true }).click()
  await page.getByRole('button', { name: 'Load more conversations', exact: true }).click()
  await expect(page.getByText('Older conversation', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Existing conversation/ }).click()
  const area = page.getByRole('region', { name: 'Chat messages' })
  await expect(page.getByText('Recent message 11.', { exact: false })).toBeVisible()
  const jump = page.getByRole('button', { name: 'Jump to latest message', exact: true })
  await expect.poll(() => area.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(2)
  await expect(jump).toHaveCount(0)
  await area.evaluate((element) => {
    element.scrollTop = 0
  })
  await expect(page.getByText('Old message 0.', { exact: false })).toBeAttached()
  expect(state.messageLoads).toEqual([null, 'older-messages'])
  await expect(jump).toBeVisible()
  await expect(jump).toHaveCSS('background-color', 'rgb(37, 37, 40)')
  await jump.hover()
  await expect.poll(() => jump.evaluate((button) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')
    context.fillStyle = getComputedStyle(button).backgroundColor
    context.fillRect(0, 0, 1, 1)
    return context.getImageData(0, 0, 1, 1).data[3]
  })).toBe(255)
  await expect.poll(() => jump.evaluate((button) => {
    const box = button.getBoundingClientRect()
    return button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
  })).toBe(true)
  await jump.click()
  await expect.poll(() => area.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(2)
  await expect(jump).toHaveCount(0)
  // Closing while reading older messages must still reopen at the latest message.
  await area.evaluate((element) => {
    element.scrollTop = 100
  })
  await expect(jump).toBeVisible()
  await page.getByRole('button', { name: 'Close WashGo assistant', exact: true }).click()
  await openChat(page)
  await expect.poll(() => area.evaluate((element) => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(2)
  await expect(jump).toHaveCount(0)
  await page.getByRole('button', { name: 'Chat history', exact: true }).click()
  const row = page.getByRole('listitem').filter({ hasText: 'Existing conversation' })
  await row.getByRole('button', { name: 'Delete conversation', exact: true }).click()
  expect(state.deletes).toHaveLength(0)
  await row.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(state.deletes).toHaveLength(0)
  await row.getByRole('button', { name: 'Delete conversation', exact: true }).click()
  await row.getByRole('button', { name: 'Delete conversation', exact: true }).last().click()
  await expect(page.getByText('Existing conversation', { exact: true })).toHaveCount(0)
  expect(state.deletes).toHaveLength(1)
})

test('unconfigured AI shows a specific error without making automatic retries', async ({ page }) => {
  const state = await setup(page, { fail: true, errorCode: 'AiNotConfigured' })
  await openChat(page)
  await question(page).fill('Help me')
  await question(page).press('Enter')
  await expect(page.getByText('The assistant service is not configured yet. Please contact WashGo or try again later.', { exact: true })).toBeVisible()
  expect(state.sends).toHaveLength(1)
  await expect(page.getByRole('button', { name: 'Compose question again', exact: true })).toBeVisible()
})

test('mobile dark layout fits, keyboard closes with focus restored, and geolocation is opt-in', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 10.77, longitude: 106.69 })
  const state = await setup(page, { dark: true })
  const launcherBox = await page.getByRole('button', { name: 'Open WashGo assistant', exact: true }).boundingBox()
  await openChat(page)
  const panel = page.getByRole('dialog', { name: 'WashGo assistant', exact: true })
  const box = await panel.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(box.y).toBeGreaterThanOrEqual(40)
  expect(box.y + box.height).toBeLessThanOrEqual(844)
  expect(box.y + box.height).toBeLessThanOrEqual(launcherBox.y - 8)
  expect(box.x).toBeLessThan(launcherBox.x)
  expect(Math.abs(box.x + box.width - launcherBox.x - launcherBox.width)).toBeLessThan(1)
  const historyBox = await panel.getByRole('button', { name: 'Chat history', exact: true }).boundingBox()
  const newChatBox = await panel.getByRole('button', { name: 'New chat', exact: true }).boundingBox()
  expect(Math.abs(historyBox.y - newChatBox.y)).toBeLessThan(1)
  const headingBox = await panel.getByRole('heading', { name: 'WashGo assistant', exact: true }).boundingBox()
  const descriptionBox = await panel.getByText('Help with your services, orders and lockers', { exact: true }).boundingBox()
  expect(Math.abs(descriptionBox.x - headingBox.x)).toBeLessThan(1)
  expect(descriptionBox.y).toBeGreaterThan(headingBox.y)
  await expect(question(page)).toHaveCSS('font-size', '16px')
  await expect(panel.getByText(/Questions are processed by Gemini/)).toHaveCount(0)
  const locationButton = page.getByRole('button', { name: 'Share location for questions', exact: true })
  await expect(locationButton).toHaveText('')
  const locationBox = await locationButton.boundingBox()
  const inputBox = await question(page).boundingBox()
  expect(locationBox.x + locationBox.width).toBeLessThanOrEqual(inputBox.x)
  await locationButton.hover()
  await expect(page.getByRole('tooltip').filter({ hasText: 'Share location for questions' })).toBeVisible()
  if (process.env.CHATBOT_QA_SCREENSHOTS) {
    await page.screenshot({ path: 'test-results/chatbot-mobile.png' })
  }
  await question(page).fill('First without location')
  await question(page).press('Enter')
  await expect(question(page)).toBeEnabled()
  expect(state.sends[0].body.context).toEqual({})
  await page.getByRole('button', { name: 'Share location for questions', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sharing location · click to disable', exact: true })).toBeVisible()
  await question(page).hover()
  await page.getByRole('button', { name: 'Sharing location · click to disable', exact: true }).hover()
  await expect(page.getByRole('tooltip').filter({ hasText: 'Sharing location · click to disable' })).toBeVisible()
  await question(page).fill('Find nearby lockers')
  await question(page).press('Enter')
  await expect.poll(() => state.sends.length).toBe(2)
  expect(state.sends[1].body.context.location).toEqual({ latitude: 10.77, longitude: 106.69 })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open WashGo assistant', exact: true })).toBeFocused()
  await page.setViewportSize({ width: 320, height: 740 })
  await openChat(page)
  const compactHistory = await panel.getByRole('button', { name: 'Chat history', exact: true }).boundingBox()
  const compactNew = await panel.getByRole('button', { name: 'New chat', exact: true }).boundingBox()
  expect(Math.abs(compactHistory.y - compactNew.y)).toBeLessThan(1)
  expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
})

test('back to top appears after scrolling across Customer pages and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await setup(page)
  const top = page.getByRole('button', { name: 'Back to top', exact: true })
  const launcher = page.getByRole('button', { name: 'Open WashGo assistant', exact: true })
  await expect(launcher.locator('svg')).toHaveCSS('animation-name', 'none')
  for (const path of ['/customer', '/customer/orders', '/customer/services', '/customer/lockers', '/customer/orders/new', '/customer/profile', '/customer/complaints', '/customer/notifications']) {
    await page.goto(path)
    await expect(launcher).toBeVisible()
    // Keep the scroll geometry independent of fixture result counts.
    await page.addStyleTag({ content: 'main { min-height: 2200px; }' })
    await expect(top).toHaveCount(0)
    await page.evaluate(() => window.scrollTo(0, 600))
    await expect(top).toBeVisible()
    expect((await top.boundingBox()).y + (await top.boundingBox()).height).toBeLessThan((await launcher.boundingBox()).y)
    await top.click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(top).toHaveCount(0)
  }
})
