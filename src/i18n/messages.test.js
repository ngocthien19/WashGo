import { describe, expect, it } from 'vitest'
import i18n from './index'
import { resolveMessage } from './messages'
import vi from './locales/vi.json'
import en from './locales/en.json'

const flatten = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => {
  const name = prefix ? `${prefix}.${key}` : key
  return typeof value === 'string' ? [[name, value]] : flatten(value, name)
})

describe('translation contract', () => {
  it('keeps both languages in sync including interpolation variables', () => {
    const vietnamese = new Map(flatten(vi))
    const english = new Map(flatten(en))
    expect([...vietnamese.keys()].sort()).toEqual([...english.keys()].sort())
    for (const [key, value] of vietnamese) {
      const variables = (text) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort()
      expect(variables(value), key).toEqual(variables(english.get(key)))
    }
  })

  it('localizes known backend errors when the language changes', async () => {
    const message = 'Mã OTP không hợp lệ hoặc đã hết hạn.'
    expect(resolveMessage(message)).toBe(message)
    await i18n.changeLanguage('en')
    expect(resolveMessage(message)).toBe('The OTP is invalid or has expired.')
  })

  it('uses a localized fallback for unknown backend errors in English', async () => {
    const message = 'Lỗi nghiệp vụ chưa có bản dịch'
    expect(resolveMessage(message)).toBe(message)
    await i18n.changeLanguage('en')
    expect(resolveMessage(message)).toBe(en.common.somethingWentWrongPleaseTryAgain)
  })
})
