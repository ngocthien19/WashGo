import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import i18n from '~/i18n'

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('vi')
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
})

// Layout observers have no dimensions in jsdom; real layout is covered by Playwright.
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.scrollTo = vi.fn()
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
