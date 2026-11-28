import { expect, it } from 'vitest'
import { merchantDefaults, merchantPayload, merchantSchema, merchantSnapshot, profileStillCurrent, readMerchantQuery, merchantFilter, contractDay, safeDocumentUrl } from './merchantModel'
import { adminNotificationHref } from '~/utils/notifications/adminNotifications'

const id = '10000000-0000-4000-8000-000000000001'
const row = { id, ...merchantDefaults(), openingSchedule: { timeZone: 'Asia/Ho_Chi_Minh', alwaysOpen: false, weekly: [{ dayOfWeek: 1, shifts: [{ open: '08:00', close: '20:00' }] }], closedDates: [] }, businessName: 'Store', email: 'owner@example.test', phone: '0901234567', address: '123 Street', city: 'HCM', latitude: 10.77, longitude: 106.7, status: 1, commissionRate: 0, imageUrls: ['/uploads/store.png'], serviceAreaIds: ['area-1'], contractStartDate: '2026-11-07T17:00:00Z' }
it('validates location, financial bounds, dates and phone before sending', async () => {
  expect(await merchantSchema.isValid(merchantDefaults(row))).toBe(true)
  for (const patch of [{ latitude: 0, longitude: 0 }, { latitude: 91 }, { commissionRate: 101 }, { commissionRate: 15.123 }, { depositAmount: -1 }, { serviceRadiusKm: 0 }, { maxCapacity: 1.5 }, { phone: 'not-a-number' }, { contractStartDate: '2026-11-08', contractEndDate: '2026-11-07' }, { contractEndDate: '2026-02-31' }]) {
    expect(await merchantSchema.isValid({ ...merchantDefaults(row), ...patch })).toBe(false)
  }
})
it('preserves zero commission, original contract instants and service area priorities', () => {
  const body = merchantPayload({ ...merchantDefaults(row), role: 'Admin', status: 3, approvedBy: 'attacker', slaDocUrl: 'https://legacy.test/sla.pdf' }, row, row.imageUrls)
  expect(body.commissionRate).toBe(0)
  expect(body.contractStartDate).toBe(row.contractStartDate)
  expect(body.serviceAreaIds).toBeNull()
  expect(body).not.toHaveProperty('slaDocUrl')
  expect(body).not.toHaveProperty('role')
  expect(body).not.toHaveProperty('status')
  expect(body).not.toHaveProperty('approvedBy')
  expect(contractDay(row.contractStartDate)).toBe('2026-11-08')
  expect(merchantPayload({ ...merchantDefaults(row), commissionRate: '', contractStartDate: '2026-11-09' }, null, []).contractStartDate).toBe('2026-11-09T00:00:00+07:00')
  expect(merchantPayload({ ...merchantDefaults(row), commissionRate: '' }, null, []).commissionRate).toBeNull()
})
it('keeps Merchant and profile-request server filters separate', () => {
  const query = readMerchantQuery(new URLSearchParams(`tab=requests&keyword=ignored&merchantId=${id}&state=1&page=2`))
  expect(merchantFilter(query)).toEqual({ page: 2, take: 12, status: 1, merchantId: id })
  const invalid = readMerchantQuery(new URLSearchParams('page=-2&tab=anything&state=8&merchantId=../profile'))
  expect(invalid).toMatchObject({ page: 1, tab: 'merchants', state: '', merchantId: '' })
})
it('detects current profile changes that approval would otherwise overwrite', () => {
  const current = { businessName: row.businessName, address: row.address, phone: row.phone, city: row.city, latitude: row.latitude, longitude: row.longitude, openingHours: '"08:00-20:00"', imageUrls: row.imageUrls, openingSchedule: row.openingSchedule }
  expect(profileStillCurrent(current, { ...row, openingHours: '08:00-20:00' })).toBe(true)
  expect(profileStillCurrent(current, { ...row, address: 'Changed address' })).toBe(false)
  expect(merchantSnapshot(row)).not.toBe(merchantSnapshot({ ...row, maxCapacity: 100 }))
})
it('uses the merchant snapshot version without false schedule conflicts and rejects stale versions', () => {
  const current = { ...row, openingSchedule: null, baseMerchantVersion: 'merchant-v1' }
  expect(profileStillCurrent(current, { ...row, version: 'merchant-v1' })).toBe(true)
  expect(profileStillCurrent(current, { ...row, version: 'merchant-v2' })).toBe(false)
})
it('handles uncaptured legacy schedules without ignoring changed contact information', () => {
  const current = { ...row, openingSchedule: null, baseMerchantVersion: 'legacy-v1' }
  expect(profileStillCurrent(current, row)).toBe(true)
  expect(profileStillCurrent(current, { ...row, phone: '0907654321' })).toBe(false)
  expect(profileStillCurrent(row, { ...row, openingSchedule: { ...row.openingSchedule, alwaysOpen: true } })).toBe(false)
})
it('honors captured null schedules and blocks legacy requests without historical evidence', () => {
  expect(profileStillCurrent({ ...row, openingSchedule: null }, row)).toBe(false)
  expect(profileStillCurrent({ ...row, openingScheduleSnapshotIncluded: true, openingSchedule: null }, row)).toBe(false)
  expect(profileStillCurrent({ ...row, baseMerchantVersion: 'v1', openingScheduleSnapshotIncluded: true, openingSchedule: null }, { ...row, version: 'v1' })).toBe(false)
})
it('compares structured schedules by business values instead of JSON ordering', () => {
  const schedule = { timeZone: 'Asia/Ho_Chi_Minh', alwaysOpen: false, weekly: [
    { dayOfWeek: 1, shifts: [{ open: '08:00', close: '12:00' }, { open: '14:00', close: '20:00' }] },
    { dayOfWeek: 2, shifts: [{ open: '08:00', close: '20:00' }] }
  ], closedDates: ['2026-12-02', '2026-12-01'] }
  const current = { ...row, openingScheduleSnapshotIncluded: true, openingSchedule: schedule }
  const reordered = { closedDates: ['2026-12-01', '2026-12-02'], weekly: [...schedule.weekly].reverse().map(day => ({ shifts: [...day.shifts].reverse(), dayOfWeek: day.dayOfWeek })), alwaysOpen: false, timeZone: schedule.timeZone }
  expect(profileStillCurrent(current, { ...row, openingSchedule: reordered })).toBe(true)
  expect(profileStillCurrent(current, { ...row, openingSchedule: { ...schedule, closedDates: [] } })).toBe(false)
  expect(profileStillCurrent(current, { ...row, openingSchedule: { ...schedule, timeZone: 'UTC' } })).toBe(false)
})
it('allows document links only with safe schemes or local upload paths', () => {
  for (const value of ['https://example.test/sla.pdf', '/uploads/docs/sla.pdf', '']) {
    expect(safeDocumentUrl(value)).toBe(true)
  }
  for (const value of ['javascript:alert(1)', 'data:text/html,hi', '//evil.test', '/uploads/../private']) {
    expect(Boolean(safeDocumentUrl(value))).toBe(false)
  }
})
it('opens Merchant notification targets in Admin only for valid identifiers', () => {
  expect(adminNotificationHref({ linkType: 'merchant-profile-request', linkId: id })).toBe(`/admin/merchants?tab=requests&request=${id}`)
  expect(adminNotificationHref({ linkType: 'merchant', linkId: id })).toBe(`/admin/merchants?merchant=${id}`)
  expect(adminNotificationHref({ linkType: 'order', linkId: id })).toBe(`/admin/orders/${id}`)
  expect(adminNotificationHref({ linkType: 'merchant', linkId: '../profile' })).toBeNull()
})
