import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { adminWorkspaceApi, parseAdminProfile } from './adminWorkspaceApi'
import { adminProfileSchema } from '~/pages/admin/Profile/profileModel'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const profile = { id: 'admin', role: 'Admin', fullName: 'Admin Name', email: 'admin@example.test', version: '63935071200123457', joinedAt: '2024-01-01T00:00:00Z', accountStatus: 'Active', editableFields: ['fullName', 'phone', 'avatar'] }
it('preserves the exact Int64 profile version on read and write and excludes privileged fields', async () => {
  const raw = JSON.stringify({ succeeded: true, data: profile }).replace('"version":"63935071200123457"', '"version":63935071200123457')
  expect(parseAdminProfile(raw).data.version).toBe('63935071200123457')
  authorizedAxios.get.mockResolvedValue({ data: parseAdminProfile(raw) })
  expect((await adminWorkspaceApi.profile()).version).toBe(profile.version)
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: profile } })
  await adminWorkspaceApi.saveProfile({ fullName: 'Changed', phone: '', avatar: '', expectedVersion: profile.version, email: 'other', role: 'Customer', id: 'other' }, 'admin')
  const body = authorizedAxios.put.mock.calls[0][1]
  expect(body.expectedVersion).toBe('63935071200123457')
  expect(body).not.toHaveProperty('email')
  expect(body).not.toHaveProperty('role')
  expect(body.avatar).toBe('')
})
it('rejects already-rounded versions and invalid Admin profile fields', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { ...profile, version: Number(profile.version) } } })
  await expect(adminWorkspaceApi.profile()).rejects.toThrow('admin.invalidResponse')
  expect(await adminProfileSchema.isValid({ fullName: 'AB', phone: '0901234567' })).toBe(true)
  expect(await adminProfileSchema.isValid({ fullName: 'A', phone: '0901234567' })).toBe(false)
  expect(await adminProfileSchema.isValid({ fullName: 'Admin', phone: 'abc0901234567' })).toBe(false)
})
it('scopes personal audit reads to JWT and whitelists system filters', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, list: [], total: 0 } })
  await adminWorkspaceApi.activities({ page: 2, take: 5, actorId: 'other', module: 'Auth' }, true)
  expect(authorizedAxios.get).toHaveBeenCalledExactlyOnceWith('/admin/me/activities', { params: { page: 2, take: 5, module: 'Auth' }, signal: undefined })
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [], total: 0 } })
  await adminWorkspaceApi.activities({ page: 1, take: 10, module: 'Auth', actorId: 'actor', role: 'Admin', changedFields: ['secret'], result: 3 }, false)
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ page: 1, take: 10, module: 'Auth', actorId: 'actor', result: 3 })
})
it('uses only password fields and requires a confirmed success; revocation is server-confirmed', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: true } })
  await adminWorkspaceApi.password({ currentPassword: 'old', newPassword: 'New12345', confirmNewPassword: 'New12345', revokeOtherSessions: true, userId: 'other' })
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('userId')
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { revoked: 2 } } })
  expect(await adminWorkspaceApi.revoke(null)).toEqual({ revoked: 2 })
  expect(authorizedAxios.post.mock.calls.at(-1)[0]).toBe('/auth/sessions/revoke-others')
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: false } })
  await expect(adminWorkspaceApi.revoke(null)).rejects.toThrow('admin.invalidResponse')
})
