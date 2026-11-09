import { expect, it } from 'vitest'
import { actionSchema, canAct, filter, readQuery, snapshot, threadSnapshot, messageSchema } from './complaintModel'
const form = { note: 'Reviewed evidence', reference: '', compensationLevel: 0, responsibleParty: '', itemValue: '' }
it('validates resolution, configured compensation value and manual payout reference', async () => {
  expect(await actionSchema('resolve').isValid(form)).toBe(true)
  for (const patch of [{ note: ' ' }, { compensationLevel: 5 }, { compensationLevel: 1, itemValue: 0 }, { compensationLevel: 2, itemValue: 100000001 }, { compensationLevel: 2, itemValue: 10.123 }, { responsibleParty: '99' }]) {
    expect(await actionSchema('resolve').isValid({ ...form, ...patch })).toBe(false)
  }
  expect(await actionSchema('resolve').isValid({ ...form, compensationLevel: 2, itemValue: 250000.5, responsibleParty: '1' })).toBe(true)
  expect(await actionSchema('pay').isValid(form)).toBe(false)
  expect(await actionSchema('pay').isValid({ ...form, note: '', reference: 'BANK-123' })).toBe(true)
  expect(await messageSchema.isValid({ content: ' ' })).toBe(false)
})
it('keeps Admin filter enums, merchant and inclusive Vietnam submission dates', () => {
  const merchantId = 'c0000000-0000-4000-8000-000000000001'
  const result = filter(readQuery(new URLSearchParams(`status=4&severity=3&type=2&merchantId=${merchantId}&page=2&from=2026-11-08&to=2026-11-09`)))
  expect(result).toMatchObject({ status: 4, severity: 3, type: 2, merchantId, page: 2, take: 12, fromDate: Date.parse('2026-11-08T00:00:00+07:00') / 1000, toDate: Date.parse('2026-11-09T23:59:59+07:00') / 1000 })
  expect(readQuery(new URLSearchParams('status=0&type=5&merchantId=bad&from=bad&page=-1'))).toMatchObject({ status: '', type: '', merchantId: '', from: '', page: 1 })
})
it('protects withdrawn and paid records and includes updated evidence in stale checks', () => {
  expect(canAct({ status: 4 }, 'resolve')).toBe(false)
  expect(canAct({ status: 1 }, 'reject')).toBe(true)
  expect(canAct({ status: 2, compensationStatus: 1, compensationAmount: 10000 }, 'pay')).toBe(true)
  expect(canAct({ status: 2, compensationStatus: 2, compensationAmount: 10000 }, 'pay')).toBe(false)
  expect(snapshot({ id: 'x', imageUrls: ['new'] })).not.toBe(snapshot({ id: 'x', imageUrls: [] }))
  expect(threadSnapshot([{ id: 'x', content: 'new evidence' }])).not.toBe(threadSnapshot([]))
})
