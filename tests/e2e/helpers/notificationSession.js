export const orderId = '11111111-1111-4111-8111-111111111111'
export const notificationId = '22222222-2222-4222-8222-222222222222'
export async function setupNotifications(page, { role = 'Customer', dark = false } = {}) {
  const state = { items: [{ id: notificationId, title: 'Your laundry is ready', content: 'Collect your items from Ben Thanh Locker.', isRead: false, linkType: 'order', linkId: orderId, createdOn: 1793923200 }], fail: false, writes: [] }
  await page.addInitScript(({ role, dark }) => localStorage.setItem('persist:root', JSON.stringify({
    auth: JSON.stringify({ user: { id: 'notification-customer', fullName: 'Alex', role }, accessToken: 'test', refreshToken: 'test', expiresAt: '2099-01-01T00:00:00Z' }),
    preferences: JSON.stringify({ language: 'en', serviceTermsSeen: { 'notification-customer': true } }), theme: JSON.stringify({ mode: dark ? 'dark' : 'light' }), _persist: JSON.stringify({ version: 1, rehydrated: true })
  })), { role, dark })
  await page.route('**/api/**', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const ok = (data) => route.fulfill({ json: { succeeded: true, data } })
    if (path === '/policy/customer') {
      return ok({ terms: { version: 'v1', content: 'Server terms' }, rules: {}, accepted: true, requiresAcceptance: false })
    }
    if (path === '/notification/filter') {
      if (state.fail) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      const body = request.postDataJSON()
      const items = state.items.filter((item) => (!body.unreadOnly || !item.isRead) && (!body.keyword || item.title.includes(body.keyword)))
      return ok({ items: items.slice((body.page - 1) * body.take, body.page * body.take), total: items.length, page: body.page, take: body.take, unreadTotal: state.items.filter((item) => !item.isRead).length, counts: ['order', 'payment', 'promotion', 'feedback', 'system'].map((group) => {
        const items = state.items.filter((item) => (item.group || 'order') === group); return { group, total: items.length, unread: items.filter((item) => !item.isRead).length }
      }) })
    }
    if (path === '/auth/me') {
      return ok({ id: 'notification-customer', fullName: 'Alex', role })
    }
    if (path === '/merchant-profile') {
      return ok({ id: 'notification-customer', businessName: 'Store name', status: 1 })
    }
    if (path === '/notification/unread-count') {
      return ok(state.items.filter((item) => !item.isRead).length)
    }
    if (path === '/notification' && request.method() === 'GET') {
      if (state.fail) {
        return route.fulfill({ status: 500, json: { succeeded: false } })
      }
      const pageNumber = Number(url.searchParams.get('page'))
      const take = Number(url.searchParams.get('take'))
      const items = state.items.filter((item) => url.searchParams.get('unreadOnly') !== 'true' || !item.isRead)
      return route.fulfill({ json: { succeeded: true, list: items.slice((pageNumber - 1) * take, pageNumber * take), total: items.length, currentPage: pageNumber, totalPages: Math.ceil(items.length / take) } })
    }
    if (path === '/notification/read-all') {
      state.writes.push(path)
      state.items.forEach((item) => {
        item.isRead = true
      })
      return ok(state.items.length)
    }
    if (path === `/notification/${notificationId}/read`) {
      state.writes.push(path)
      state.items[0].isRead = true
      return ok(state.items[0])
    }
    if (path === '/notification' && request.method() === 'DELETE') {
      state.writes.push('delete-all')
      const count = state.items.length
      state.items = []
      return ok(count)
    }
    if (path === `/notification/${notificationId}` && request.method() === 'DELETE') {
      state.writes.push(path)
      state.items = []
      return ok(true)
    }
    return route.fulfill({ status: 404, json: { succeeded: false } })
  })
  return state
}
