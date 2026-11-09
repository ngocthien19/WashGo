import { expect, it } from 'vitest'
import { defaults, filter, localTime, payload, promotionSchema, readQuery, snapshot } from './promotionModel'

const sample = { code: 'WASH20', description: '', discountType: 1, discountValue: 20, minOrderAmount: 0, maxDiscountAmount: '', startAt: '2026-11-08T08:00', endAt: '2026-12-08T08:00', usageLimit: '', usageLimitPerCustomer: '', isActive: true }
it('validates percentage, money precision, real dates and usage limits', async () => {
  expect(await promotionSchema.isValid(sample)).toBe(true)
  for (const patch of [{ discountValue: 101 }, { discountValue: 0 }, { discountValue: 20.123 }, { minOrderAmount: -1 }, { maxDiscountAmount: 0 }, { usageLimit: 2, usageLimitPerCustomer: 3 }, { usageLimit: 1.5 }, { startAt: '2026-02-30T08:00' }, { endAt: sample.startAt }, { code: 'a b' }]) {
    expect(await promotionSchema.isValid({ ...sample, ...patch }), JSON.stringify(patch)).toBe(false)
  }
  expect(await promotionSchema.isValid({ ...sample, discountType: 2, discountValue: 30000 })).toBe(true)
})
it('normalizes codes, sends null limits and converts Vietnam times explicitly', async () => {
  const parsed = await promotionSchema.validate({ ...sample, code: ' wash20 ' })
  expect(payload(parsed)).toMatchObject({ code: 'WASH20', usageLimit: null, usageLimitPerCustomer: null, maxDiscountAmount: null, startAt: '2026-11-08T01:00:00.000Z' })
})
it('preserves original timestamps and activation when editing without changing time', () => {
  const record = { ...sample, id: 'id', usedCount: 3, startAt: '2026-11-08T01:00:45.123Z', endAt: '2026-12-08T01:00:59Z', isActive: false }
  expect(localTime(record.startAt)).toBe('2026-11-08T08:00')
  expect(payload({ ...defaults(record), isActive: true }, record)).toMatchObject({ startAt: record.startAt, endAt: record.endAt, isActive: false })
  expect(snapshot({ ...record, usedCount: 4 })).not.toBe(snapshot(record))
})
it('retains inactive status zero and filters date overlap with inclusive Vietnam boundaries', () => {
  const query = readQuery(new URLSearchParams('status=0&type=2&page=2&from=2026-11-08&to=2026-11-09'))
  expect(filter(query)).toEqual({ status: 0, discountType: 2, keyword: undefined, page: 2, take: 12, fromDate: Date.parse('2026-11-08T00:00:00+07:00') / 1000, toDate: Date.parse('2026-11-09T23:59:59+07:00') / 1000 })
  expect(readQuery(new URLSearchParams('status=99&page=-1&from=bad'))).toMatchObject({ status: '', page: 1, from: '', to: '' })
})
