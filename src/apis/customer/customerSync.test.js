import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { customerIncidentApi } from './customerIncidentApi'
import { customerPolicyApi } from './customerPolicyApi'
import { customerReceiptApi } from './customerReceiptApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
const wrap = (data) => ({ data: { succeeded: true, data } })
beforeEach(() => vi.clearAllMocks())
it('only posts the policy version and rejects acknowledgement for a different version', async () => {
  authorizedAxios.post.mockResolvedValue(wrap({ terms: { version: 'v2', content: 'Terms' }, rules: {}, accepted: true, requiresAcceptance: false, acceptedVersion: 'v2' }))
  await expect(customerPolicyApi.acknowledge('v1')).rejects.toThrow()
  expect(authorizedAxios.post).toHaveBeenCalledWith('/policy/customer/acknowledge', { version: 'v1' })
})
it('does not trust eligibility or receipts belonging to another order', async () => {
  authorizedAxios.get.mockResolvedValue(wrap({ orderId: 'other', canReport: true }))
  await expect(customerIncidentApi.eligibility('own')).rejects.toThrow()
  authorizedAxios.get.mockResolvedValue(wrap({ orderId: 'other', receiptNumber: 'R1', lines: [], fees: [], payments: [], totalPaid: 50 }))
  await expect(customerReceiptApi.get('own')).rejects.toThrow()
})
it('returns null only for an absent request and surfaces lookup service errors', async () => {
  authorizedAxios.get.mockRejectedValueOnce({ response: { status: 404 } }).mockRejectedValueOnce({ response: { status: 500 } })
  expect(await customerIncidentApi.request('key')).toBeNull()
  await expect(customerIncidentApi.request('key')).rejects.toMatchObject({ response: { status: 500 } })
})
it('whitelists customer edits and messages without submitting identity or status', async () => {
  const fields = { type: 1, severity: 2, description: 'Damaged', imageUrls: ['/uploads/photo.png'], videoUrls: ['/uploads/video.mp4'] }
  authorizedAxios.put.mockResolvedValue(wrap({ id: 'incident', orderId: 'own', status: 1 }))
  await customerIncidentApi.update('incident', { ...fields, customerId: 'attacker', status: 2, orderId: 'other' })
  expect(authorizedAxios.put).toHaveBeenCalledWith('/incident/incident', fields)
  authorizedAxios.post.mockResolvedValue(wrap({ id: 'message', incidentId: 'incident' }))
  await customerIncidentApi.message('incident', { content: 'Evidence', imageUrls: [], videoUrls: fields.videoUrls, senderRole: 'Admin' })
  expect(authorizedAxios.post).toHaveBeenCalledWith('/incident/incident/messages', { content: 'Evidence', imageUrls: [], videoUrls: fields.videoUrls })
})
