import { expect, it } from 'vitest'
import { resolveApiUrl } from './apiConfig'

it('uses Render for production builds without a deployed env file', () => {
  expect(resolveApiUrl(undefined, true)).toBe('https://washgo-be-staging.onrender.com')
  expect(resolveApiUrl('  ', true)).toBe('https://washgo-be-staging.onrender.com')
})

it('retains the local proxy for development and explicit Docker builds', () => {
  expect(resolveApiUrl(undefined, false)).toBe('/api')
  expect(resolveApiUrl('/api', true)).toBe('/api')
})

it('honors an explicit API origin and removes trailing slashes', () => {
  expect(resolveApiUrl(' https://api.example.test/ ', true)).toBe('https://api.example.test')
})
