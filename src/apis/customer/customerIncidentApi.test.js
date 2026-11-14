import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { customerIncidentApi } from './customerIncidentApi'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const incident = { id: 'incident-one', orderId: 'order-one', status: 1 }
const response = (data) => ({ data: { succeeded: true, data } })

it('sends only allowed customer fields and rejects an unverified creation response', async () => {
  authorizedAxios.post.mockResolvedValue(response(incident))
  const payload = { orderId: 'order-one', type: 2, severity: 3, description: 'Lost shirt', imageUrls: ['/uploads/photo.png'] }
  await customerIncidentApi.create({ ...payload, customerId: 'other', compensationAmount: 999, status: 2 })
  expect(authorizedAxios.post).toHaveBeenCalledWith('/incident', payload)
  authorizedAxios.post.mockResolvedValue(response({ ...incident, orderId: 'wrong-order' }))
  await expect(customerIncidentApi.create(payload)).rejects.toThrow('customer.incidents.invalidResponse')
})

it('uses the customer mine endpoint with pagination only and checks detail identity', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, list: [incident], total: 1, currentPage: 2, totalPages: 2 } })
  await customerIncidentApi.list(2)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/incident/mine', { params: { page: 2, take: 6 }, signal: undefined })
  authorizedAxios.get.mockResolvedValue(response(incident))
  await expect(customerIncidentApi.get('wrong-id')).rejects.toThrow('customer.incidents.invalidResponse')
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: false, data: incident } })
  await expect(customerIncidentApi.get(incident.id)).rejects.toThrow('customer.incidents.invalidResponse')
})

it('rejects malformed lists instead of displaying empty or fabricated complaint data', async () => {
  for (const data of [{ succeeded: true }, { succeeded: true, list: [{}], total: 1, currentPage: 1, totalPages: 1 }]) {
    authorizedAxios.get.mockResolvedValue({ data })
    await expect(customerIncidentApi.list(1)).rejects.toThrow('customer.incidents.invalidResponse')
  }
})
