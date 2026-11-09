import { expect, it } from 'vitest'
import { settingsSchema, settingPayload, settingSnapshot, settingChanges, validSettings } from './settingModel'
import { systemSettingsFixture } from '~/test/fixtures/systemSettings'

it('accepts valid settings and rejects incomplete or invalid configuration responses', () => {
  const value = systemSettingsFixture()
  expect(validSettings(value)).toBe(true)
  for (const patch of [{ depositWindowMinutes: '30' }, { defaultCommissionRate: null }, { storageTransferAfterHours: 0 }, { compensationLostPercent: 90 }, { updatedAt: 'bad' }]) {
    expect(validSettings({ ...value, ...patch })).toBe(false)
  }
})
it('validates SLA ranges and rejects blanks and fractional hours', async () => {
  const value = systemSettingsFixture()
  for (const patch of [{ depositWindowMinutes: '' }, { depositWindowMinutes: 4 }, { merchantCollectSlaHours: 169 }, { freePickupHours: 1.5 }, { merchantReturnSlaHours: 721 }]) {
    expect(await settingsSchema('sla').isValid({ ...value, ...patch })).toBe(false)
  }
  expect(await settingsSchema('sla').isValid({ ...value, depositWindowMinutes: '1440', freePickupHours: 720 })).toBe(true)
})
it('preserves legitimate zero commission and enforces percentage precision', async () => {
  expect(await settingsSchema('commission').isValid({ defaultCommissionRate: 0 })).toBe(true)
  expect(await settingsSchema('commission').isValid({ defaultCommissionRate: '20.25' })).toBe(true)
  for (const value of ['', -1, 100.01, 20.255]) {
    expect(await settingsSchema('commission').isValid({ defaultCommissionRate: value })).toBe(false)
  }
})
it('validates whole VND fees and ordered compensation, including equal and zero rates', async () => {
  const value = systemSettingsFixture()
  for (const patch of [{ overdueFeeDay1: 10000001 }, { storageFeePerDay: 1.5 }, { cancelCollectedPercent: 101 }, { compensationLostPercent: 501 }, { compensationMediumPercent: 29 }]) {
    expect(await settingsSchema('penalty').isValid({ ...value, ...patch })).toBe(false)
  }
  expect(await settingsSchema('penalty').isValid({ ...value, compensationLightPercent: 0, compensationMediumPercent: 0, compensationSeverePercent: 0, compensationLostPercent: 0 })).toBe(true)
})
it('whitelists each complete command and detects stale settings and actual changes', () => {
  const value = systemSettingsFixture()
  expect(settingPayload('commission', { ...value, defaultCommissionRate: '0', updatedBy: 'fake' })).toEqual({ defaultCommissionRate: 0 })
  expect(Object.keys(settingPayload('penalty', value))).toHaveLength(11)
  expect(settingChanges('sla', value, { ...value, depositWindowMinutes: '30' })).toEqual([])
  expect(settingSnapshot(value)).not.toBe(settingSnapshot({ ...value, updatedAt: '2026-11-08T00:00:00Z' }))
})
