import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { adminPromotionApi } from './adminPromotionApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const id = 'a0000000-0000-4000-8000-000000000001'
const record = { id, version: 'v1', code: 'SAVE20', discountType: 1, discountValue: 20, minOrderAmount: 0, startAt: '2026-11-01T00:00:00Z', endAt: '2026-12-01T00:00:00Z', usedCount: 0, isActive: true, status: 2 }
beforeEach(() => vi.clearAllMocks())
it('whitelists server filters and preserves inactive zero', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [record], total: 13 } })
  expect(await adminPromotionApi.list({ page: 2, take: 12, status: 0, role: 'Admin', sortBy: [{ field: 'Code', asc: true }] })).toMatchObject({ currentPage: 2, totalPages: 2 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ page: 2, take: 12, status: 0, sortBy: [{ field: 'Code', asc: true }] })
})
it('never submits usage, status, actor or unsupported media fields', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: record } })
  await adminPromotionApi.update({ ...record, expectedVersion: record.version, createdBy: id, imageUrls: ['fake'] })
  expect(authorizedAxios.put.mock.calls[0][1]).not.toHaveProperty('usedCount')
  expect(authorizedAxios.put.mock.calls[0][1]).not.toHaveProperty('status')
  expect(authorizedAxios.put.mock.calls[0][1]).not.toHaveProperty('createdBy')
  expect(authorizedAxios.put.mock.calls[0][1]).not.toHaveProperty('imageUrls')
})
it('sets an explicit target status and marks mismatched write acknowledgements uncertain', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: { ...record, isActive: false } } })
  expect(await adminPromotionApi.toggle(record)).toBe(false)
  await expect(adminPromotionApi.toggle({ ...record, isActive: false })).rejects.toMatchObject({ uncertain: true })
  authorizedAxios.delete.mockResolvedValue({ data: { succeeded: true, data: null } })
  await expect(adminPromotionApi.remove(id, 'v1')).rejects.toMatchObject({ uncertain: true })
})
it('validates statistics identity and CSV media before allowing a download', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { promotionId: 'wrong', daily: [] } } })
  await expect(adminPromotionApi.statistics(id, {})).rejects.toThrow('admin.invalidResponse')
  authorizedAxios.get.mockResolvedValue({ data: new Blob(['{}']), headers: { 'content-type': 'application/json' } })
  await expect(adminPromotionApi.export(id, {})).rejects.toThrow('admin.invalidResponse')
  authorizedAxios.get.mockResolvedValue({ data: new Blob(['date,uses\n']), headers: { 'content-type': 'text/csv; charset=utf-8' } })
  expect(await adminPromotionApi.export(id, {})).toBeInstanceOf(Blob)
})
