import { beforeEach, expect, it, vi } from 'vitest'
import { adminSystemSettingApi } from './adminSystemSettingApi'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { systemSettingsFixture } from '~/test/fixtures/systemSettings'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), put: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('never sends retired dispatch writes', async () => {
  await expect(adminSystemSettingApi.update('dispatch', { maxActiveTasksPerShipper: 4 }, 'v1')).rejects.toThrow()
  expect(authorizedAxios.put).not.toHaveBeenCalled()
})
it('maps loyalty settings and writes only rates with version and operation identity', async () => {
  const value = { ...systemSettingsFixture(), loyaltyEarnPercent: 1.25, loyaltyMaxUsePercent: 20 }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: value } })
  expect(await adminSystemSettingApi.get()).toMatchObject({ earnPercent: 1.25, maxUsePercent: 20 })
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: value } })
  await adminSystemSettingApi.update('loyalty', { earnPercent: 1.25, maxUsePercent: 20, customerId: 'fake' }, 'v-loyalty')
  expect(authorizedAxios.put).toHaveBeenLastCalledWith('/system-setting/loyalty', { earnPercent: 1.25, maxUsePercent: 20, expectedVersion: 'v-loyalty', operationId: expect.any(String) })
})
it('reads actual settings and forwards cancellation signal', async () => {
  const value = systemSettingsFixture(), signal = new AbortController().signal
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: value } })
  expect(await adminSystemSettingApi.get(signal)).toEqual(value)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/system-setting', { signal })
})
it('PUT sends only supported group fields, keeping zero and no metadata', async () => {
  const value = { ...systemSettingsFixture(), defaultCommissionRate: 0 }
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: value } })
  await adminSystemSettingApi.update('commission', { ...value, actorId: 'fake', storageTransferAfterHours: 120 }, 'v1')
  expect(authorizedAxios.put).toHaveBeenCalledWith('/system-setting/commission', expect.objectContaining({ defaultCommissionRate: 0, expectedVersion: 'v1', operationId: expect.any(String) }))
})
it('treats incomplete or nonmatching write acknowledgements as an uncertain result', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: systemSettingsFixture() } })
  await expect(adminSystemSettingApi.update('commission', { defaultCommissionRate: 25 }, 'v1')).rejects.toMatchObject({ uncertain: true })
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { defaultCommissionRate: 25 } } })
  await expect(adminSystemSettingApi.get()).rejects.toThrow('admin.invalidResponse')
})
