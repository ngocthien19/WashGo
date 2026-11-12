import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { adminComplaintApi } from './adminComplaintApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
const id = 'a0000000-0000-4000-8000-000000000001'
const record = { id, orderId: id, customerId: id, orderCode: 'WG01', customerName: 'Customer', description: 'Damaged jacket', status: 1, type: 1, severity: 2, compensationStatus: 0, compensationAmount: 0 }
beforeEach(() => vi.clearAllMocks())
it('whitelists Admin filters and preserves server totals', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [record], total: 25 } })
  expect(await adminComplaintApi.list({ page: 2, take: 12, status: 4, compensationStatus: 1, sortBy: [{ field: 'CreatedOn', asc: false }] })).toMatchObject({ currentPage: 2, totalPages: 3 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ page: 2, take: 12, status: 4, compensationStatus: 1, sortBy: [{ field: 'CreatedOn', asc: false }] })
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [{ ...record, imageUrls: 'invalid' }], total: 1 } })
  await expect(adminComplaintApi.list({ page: 1, take: 12 })).rejects.toThrow('admin.invalidResponse')
})
it('resolution never accepts client compensation amount, status or reviewer', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { ...record, status: 2 } } })
  await adminComplaintApi.resolve(id, { expectedVersion: 'v1', expectedSettingsVersion: 's1', resolutionNote: 'Reviewed', compensationLevel: 2, itemValue: 100000, responsibleParty: 1, compensationAmount: 70000, reviewedBy: id, status: 2 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual(expect.objectContaining({ resolutionNote: 'Reviewed', responsibleParty: 1, compensationLevel: 2, itemValue: 100000, expectedVersion: 'v1', expectedSettingsVersion: 's1', operationId: expect.any(String) }))
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('compensationAmount')
})
it('checks acknowledged outcomes and references, including payout replay from another request', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { ...record, status: 2, compensationStatus: 2, compensationReference: 'OTHER' } } })
  await expect(adminComplaintApi.pay(id, 'BANK-123', 'v1')).rejects.toMatchObject({ uncertain: true })
  await expect(adminComplaintApi.reject(id, 'Invalid', 'v1')).rejects.toMatchObject({ uncertain: true })
})
it('reads dynamic rates and verifies messages belong to this incident and role', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { compensationLightPercent: 20, compensationMediumPercent: 60, compensationSeverePercent: 100, compensationLostPercent: 150, defaultCommissionRate: 20 } } })
  expect(await adminComplaintApi.settings()).not.toHaveProperty('defaultCommissionRate')
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: [{ id, incidentId: 'wrong', content: 'Hello', senderName: 'Admin', senderRole: 'Admin' }] } })
  await expect(adminComplaintApi.messages(id)).rejects.toThrow('admin.invalidResponse')
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { id, incidentId: id, content: 'Hello', senderName: 'Customer', senderRole: 'Customer' } } })
  await expect(adminComplaintApi.message(id, { content: 'Hello', expectedVersion: 'v1' })).rejects.toMatchObject({ uncertain: true })
})

it('enriches only the selected incident from authorized sources and rejects a mismatched order owner', async () => {
  authorizedAxios.get.mockImplementation(path => Promise.resolve({ data: { succeeded: true, data: path.startsWith('/wash-order/') ? { id, customerId: id, customerPhoneNumber: '0901000001' } : { id, businessName: 'Store', email: 'm@example.test', phone: '0903000003', imageUrls: ['/uploads/m.png'] } } }))
  expect(await adminComplaintApi.contacts({ ...record, merchantId: id })).toMatchObject({ customer: { phone: '0901000001', email: null }, merchant: { email: 'm@example.test', phone: '0903000003' } })
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { id, customerId: 'wrong', customerPhoneNumber: 'PRIVATE' } } })
  expect((await adminComplaintApi.contacts(record)).customer.phone).toBeNull()
})
