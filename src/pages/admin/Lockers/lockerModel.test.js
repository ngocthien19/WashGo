import { expect, it } from 'vitest'
import { adminLockerFilter, readAdminLockerQuery, writeAdminLockerQuery, lockerDefaults, lockerPayload, lockerSchema, lockerSnapshot } from './lockerModel'

const id = '11111111-1111-4111-8111-111111111111'
it('keeps Admin filters in the URL and sends resource IDs with server paging', () => {
  const query = readAdminLockerQuery(new URLSearchParams(`city=Test&merchantId=${id}&status=2&page=3&sort=nameDesc`))
  expect(adminLockerFilter(query)).toMatchObject({ city: 'Test', merchantId: id, status: 2, page: 3, take: 12, sortBy: [{ field: 'Name', isDescending: true }] })
  expect(readAdminLockerQuery(new URLSearchParams(writeAdminLockerQuery(query)))).toEqual(query)
  expect(readAdminLockerQuery(new URLSearchParams('merchantId=invalid&status=9&page=-1'))).toMatchObject({ merchantId: '', status: '', page: 1 })
})
it('preserves legacy district and service area while omitting code and box configuration on update', () => {
  const locker = { id, code: 'LK01', name: 'Station', address: 'Street', ward: 'Ward', city: 'City', latitude: 10, longitude: 106, district: 'legacy', serviceAreaId: id, status: 1 }
  const body = lockerPayload(lockerDefaults(locker), locker, null, [])
  expect(body).toMatchObject({ id, ward: 'Ward', district: 'legacy', serviceAreaId: id, merchantIds: null, imageUrls: [] })
  for (const key of ['code', 'boxes', 'boxCount', 'defaultBoxSize']) {
    expect(body).not.toHaveProperty(key)
  }
  const create = lockerPayload(lockerDefaults(), null, [id], [])
  expect(create).toMatchObject({ boxCount: 10, defaultBoxSize: 2 })
  expect(create).not.toHaveProperty('code')
  expect(create).not.toHaveProperty('status')
  expect(create).not.toHaveProperty('ward')
  expect(create).not.toHaveProperty('district')
})
it('rejects unsupported box counts and a zero map point; follows the database name limit', async () => {
  const values = { ...lockerDefaults(), code: 'LK01', name: 'Station', address: 'Street', city: 'City', latitude: 10, longitude: 106 }
  expect(await lockerSchema.isValid(values)).toBe(true)
  expect(await lockerSchema.validate(values)).not.toHaveProperty('code')
  expect(await lockerSchema.isValid({ ...values, code: '' })).toBe(true)
  await expect(lockerSchema.validate({ ...values, latitude: 0, longitude: 0 })).rejects.toMatchObject({ path: 'latitude' })
  for (const patch of [{ boxCount: 201 }, { boxCount: 0 }, { boxCount: 1.5 }, { latitude: 0, longitude: 0 }, { name: 'x'.repeat(101) }]) {
    expect(await lockerSchema.isValid({ ...values, ...patch })).toBe(false)
  }
})
it('detects changed box status or merchant priorities without depending on response array order', () => {
  const locker = { id, boxes: [{ id: 'b', status: 1 }, { id: 'a', status: 4 }], merchants: [{ merchantId: id, priority: 1 }] }
  expect(lockerSnapshot({ ...locker, boxes: [...locker.boxes].reverse() })).toBe(lockerSnapshot(locker))
  expect(lockerSnapshot({ ...locker, boxes: [{ id: 'a', status: 1 }, { id: 'b', status: 1 }] })).not.toBe(lockerSnapshot(locker))
})
