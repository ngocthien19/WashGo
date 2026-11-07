import { expect, it } from 'vitest'
import i18n from '~/i18n'
import { notificationFilters, notificationText, notificationHighlights } from './notificationModel'
it('translates supported server templates and keeps original content if arguments are missing', async () => {
  await i18n.changeLanguage('en')
  const item = { title: 'Original title', content: 'Original body', messageKey: 'orderCreated.customer', messageArgs: { orderCode: 'WG123', lockerName: 'Ben Thanh', boxNumber: '2', depositMinutes: '30' } }
  const translated = notificationText(item, i18n.t.bind(i18n))
  expect(translated.title).not.toBe(item.title)
  expect(translated.content).toContain('WG123')
  expect(translated.content).toContain('Ben Thanh')
  expect(translated.content).not.toContain('{{')
  expect(notificationText({ ...item, messageArgs: {} }, i18n.t.bind(i18n)).content).toBe(item.content)
  expect(notificationText({ ...item, messageKey: 'unknown.future.template' }, i18n.t.bind(i18n))).toEqual({ title: item.title, content: item.content })
})

it('highlights structured details without modifying content or treating evidence as HTML', () => {
  const content = 'Order #WG123 at Ben Thanh, box 2, within 30 minutes. Reason: <b>Changed plans</b>.'
  const parts = notificationHighlights({ messageArgs: { orderCode: 'WG123', lockerName: 'Ben Thanh', boxNumber: '2', reason: '<b>Changed plans</b>' } }, content)
  expect(parts.map((part) => part.text).join('')).toBe(content)
  const bold = parts.filter((part) => part.bold).map((part) => part.text)
  expect(bold).toEqual(expect.arrayContaining(['#WG123', 'Ben Thanh', '2', '30 minutes', '<b>Changed plans</b>']))
})
it('highlights legacy station names and reasons with no structured arguments', () => {
  const content = 'Đơn #WG123 tại Trạm Locker Bến Thành, ô số 2 trong 30 phút. Lý do: Không còn nhu cầu.'
  const parts = notificationHighlights({}, content)
  expect(parts.map((part) => part.text).join('')).toBe(content)
  expect(parts.filter((part) => part.bold).map((part) => part.text)).toEqual(expect.arrayContaining(['Trạm Locker Bến Thành', 'Không còn nhu cầu', '30 phút']))
})
it('normalizes server filter dates and rejects unsupported group/type/sort', () => {
  const valid = notificationFilters(new URLSearchParams('keyword= laundry &group=order&type=16&sort=oldest&from=2026-11-01&to=2026-11-07'))
  expect(valid).toMatchObject({ keyword: 'laundry', groups: ['order'], types: [16], sort: 'oldest' })
  expect(valid.toDate - valid.fromDate).toBe(7 * 86400 - 1)
  const invalid = notificationFilters(new URLSearchParams('group=admin&type=40&sort=whatever&from=bad'))
  expect(invalid).toMatchObject({ groups: undefined, types: undefined, sort: 'newest' })
  expect(invalid.fromDate).toBeUndefined()
})

it('does not treat the first letter of a Vietnamese word as currency', () => {
  const content = 'Ô số 1 để gửi đồ; phí 30.000 đ. Còn 30 phút để gửi.'
  const parts = notificationHighlights({ messageArgs: { boxNumber: '1' } }, content)
  expect(parts.map((part) => part.text).join('')).toBe(content)
  const bold = parts.filter((part) => part.bold).map((part) => part.text)
  expect(bold).toEqual(['1', '30.000 đ', '30 phút'])
  expect(bold.some((text) => text.endsWith(' đ') && !text.includes('30.000'))).toBe(false)
})

it('marks only the reason red and keeps other important details neutral', () => {
  const content = 'Đơn #WG123 đã hủy. Lý do: Không còn nhu cầu trong 30 phút.'
  for (const item of [{}, { messageArgs: { reason: 'Không còn nhu cầu trong 30 phút' } }]) {
    const parts = notificationHighlights(item, content)
    expect(parts.filter((part) => part.reason).map((part) => part.text).join('')).toBe('Không còn nhu cầu trong 30 phút')
    expect(parts.find((part) => part.text === '#WG123')?.reason).toBe(false)
    expect(parts.map((part) => part.text).join('')).toBe(content)
  }
})
