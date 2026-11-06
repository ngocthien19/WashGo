import { expect, it } from 'vitest'
import { incidentSchema, incidentReportDeadline, readIncidentPage } from './incidentModel'

it('validates and trims the customer report without accepting unsupported enums', async () => {
  expect(await incidentSchema.validate({ type: 2, severity: 3, description: '  Lost shirt  ' })).toEqual({ type: 2, severity: 3, description: 'Lost shirt' })
  for (const values of [{ type: 4, severity: 1, description: 'test' }, { type: 1, severity: 0, description: 'test' }, { type: 1, severity: 1, description: '  ' }, { type: 1, severity: 1, description: 'a'.repeat(2001) }]) {
    await expect(incidentSchema.validate(values)).rejects.toThrow()
  }
})

it('uses the latest recorded completion, never order creation or a different milestone', () => {
  expect(incidentReportDeadline({ createdOn: 1, timeline: [{ status: 11, timestamp: 50 }] })).toBeNull()
  expect(incidentReportDeadline({ timeline: [{ status: 12, timestamp: 100 }, { status: 12, timestamp: 200 }, { status: 11, timestamp: 1000 }] })).toBe((200 + 3 * 86400) * 1000)
})

it('normalizes invalid page links without carrying customer/admin filter parameters', () => {
  for (const value of ['0', '-1', '1.2', 'bad', 'Infinity']) {
    expect(readIncidentPage(new URLSearchParams({ page: value }))).toBe(1)
  }
  expect(readIncidentPage(new URLSearchParams({ page: '2', customerId: 'other' }))).toBe(2)
})
