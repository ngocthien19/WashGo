export async function merchantSession(page, options = {}) {
  await page.addInitScript(({ role, dark }) => localStorage.setItem('persist:root', JSON.stringify({
    auth: JSON.stringify({ user: { id: 'merchant-test', fullName: 'Alex Store Owner', email: 'merchant@example.test', role }, accessToken: 'mock-access', refreshToken: 'mock-refresh', expiresAt: '2099-01-01T00:00:00Z' }),
    preferences: JSON.stringify({ language: 'en', serviceTermsSeen: { 'merchant-test': true } }), theme: JSON.stringify({ mode: dark ? 'dark' : 'light' }), _persist: JSON.stringify({ version: 1, rehydrated: true })
  })), { role: options.role || 'Merchant', dark: options.dark || false })
}
