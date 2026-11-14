import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => vi.resetModules())

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('keeps Google sign-in unavailable when no build client ID is configured', async () => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
  const { GOOGLE_SIGN_IN } = await import('./constants')
  expect(GOOGLE_SIGN_IN.CLIENT_ID).toBe('')
})

it('uses the same public build setting for Vite, Docker and Vercel', async () => {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', ' 123-build.apps.googleusercontent.com ')
  const { GOOGLE_SIGN_IN } = await import('./constants')
  expect(GOOGLE_SIGN_IN.CLIENT_ID).toBe('123-build.apps.googleusercontent.com')
})
