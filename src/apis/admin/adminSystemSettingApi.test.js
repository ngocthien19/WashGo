import { beforeEach, expect, it, vi } from 'vitest'
import { adminSystemSettingApi } from './adminSystemSettingApi'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { systemSettingsFixture } from '~/test/fixtures/systemSettings'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), put: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
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
