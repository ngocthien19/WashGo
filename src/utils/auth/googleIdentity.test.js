import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
})
afterEach(() => {
  document.head.querySelectorAll('script[src*="accounts.google.com/gsi/client"]').forEach(script => script.remove())
  delete window.google
  vi.clearAllTimers()
  vi.useRealTimers()
})

const script = () => document.head.querySelector('script[src*="accounts.google.com/gsi/client"]')
const loaded = () => {
  const sdk = { initialize: vi.fn(), renderButton: vi.fn() }
  window.google = { accounts: { id: sdk } }
  script().dispatchEvent(new Event('load'))
  return sdk
}

it('pins the SDK language and shares a single load for the same locale', async () => {
  const { loadGoogleIdentity } = await import('./googleIdentity')
  const first = loadGoogleIdentity('en')
  expect(loadGoogleIdentity('en-US')).toBe(first)
  expect(new URL(script().src).searchParams.get('hl')).toBe('en')
  const sdk = loaded()
  expect(await first).toBe(sdk)
  expect(await loadGoogleIdentity('en')).toBe(sdk)
})

it('serializes a language change and initializes the replacement SDK with the current credential handler', async () => {
  const { loadGoogleIdentity, subscribeGoogleCredential } = await import('./googleIdentity')
  const first = loadGoogleIdentity('vi')
  const next = loadGoogleIdentity('en')
  expect(new URL(script().src).searchParams.get('hl')).toBe('vi')
  const oldScript = script()
  const initial = loaded()
  await first
  subscribeGoogleCredential(initial, vi.fn())
  await vi.waitFor(() => expect(new URL(script().src).searchParams.get('hl')).toBe('en'))
  expect(oldScript.isConnected).toBe(false)
  const english = loaded()
  expect(await next).toBe(english)
  const handler = vi.fn()
  subscribeGoogleCredential(english, handler)
  english.initialize.mock.calls[0][0].callback({ credential: 'test-credential' })
  expect(handler).toHaveBeenCalledWith({ credential: 'test-credential' })
})

it('does not load a stale language after switching back while the SDK is pending', async () => {
  const { loadGoogleIdentity } = await import('./googleIdentity')
  const first = loadGoogleIdentity('vi')
  const stale = loadGoogleIdentity('en')
  const current = loadGoogleIdentity('vi')
  const initialScript = script()
  const sdk = loaded()
  expect(await first).toBe(sdk)
  expect(await current).toBe(sdk)
  expect(await stale).toBe(sdk)
  expect(script()).toBe(initialScript)
  expect(new URL(script().src).searchParams.get('hl')).toBe('vi')
})

it('can retry a failed language load', async () => {
  const { loadGoogleIdentity } = await import('./googleIdentity')
  const failed = loadGoogleIdentity('en')
  const assertion = expect(failed).rejects.toThrow('common.unableToConnectToGooglePleaseTryAgainOr')
  script().dispatchEvent(new Event('error'))
  await assertion
  const retry = loadGoogleIdentity('en')
  const sdk = loaded()
  expect(await retry).toBe(sdk)
})
