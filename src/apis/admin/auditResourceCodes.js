import { adminReviewApi } from './adminReviewApi'
import { isId } from '~/pages/admin/Merchants/merchantModel'

// Resolve masked public order references once per review in this response.
// The original audit payload and scrubbed free text remain unchanged.
export async function resolveAuditCodes(rows, signal) {
  const ids = [...new Set(rows.filter(row => row.resourceType === 'OrderRating' && isId(row.resourceId) && /\[number\]/i.test(row.resourceCode || '')).map(row => row.resourceId))]
  const codes = new Map(await Promise.all(ids.map(async id => {
    try {
      const review = await adminReviewApi.detail(id, signal)
      return [id, /^WG[A-Z0-9-]+$/i.test(review.orderCode) ? review.orderCode : null]
    } catch (error) {
      if (signal?.aborted) {
        throw error
      }
      return [id, null]
    }
  })))
  return rows.map(row => codes.get(row.resourceId) && row.resourceType === 'OrderRating' ? { ...row, displayResourceCode: codes.get(row.resourceId) } : row)
}
