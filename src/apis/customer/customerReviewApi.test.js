import { beforeEach, expect, it, vi } from 'vitest'
import { Blob as BinaryBlob } from 'node:buffer'
import authorizedAxios from '~/utils/authorizedAxios'
import { customerReviewApi } from './customerReviewApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())
const id = '11111111-1111-4111-8111-111111111111'
const row = { id, overallStars: 5, comment: 'Great care', publishedAt: '2026-11-14T01:00:00Z', imageUrls: [`/customer/reviews/${id}/images/0`] }
const ok = data => ({ data: { succeeded: true, data } })
it('uses Customer-only paging and rating filters, dropping extra identity and order fields', async () => {
  authorizedAxios.get.mockResolvedValue(ok({ items: [{ ...row, customerName: 'Private', orderCode: 'Private' }], total: 5, page: 2, take: 4, hasMore: false }))
  const signal = new AbortController().signal
  expect(await customerReviewApi.list({ page: 2, take: 4, stars: 5, serviceId: 'unsupported' }, signal)).toMatchObject({ list: [row], total: 5 })
  expect(authorizedAxios.get).toHaveBeenCalledWith('/customer/reviews', { params: { page: 2, take: 4, stars: 5 }, signal })
})
it('reads global statistics without a filter and keeps empty average unknown', async () => {
  const summary = { total: 0, averageStars: null, distribution: [1, 2, 3, 4, 5].map(stars => ({ stars, count: 0, rate: 0 })) }
  authorizedAxios.get.mockResolvedValue(ok(summary))
  expect(await customerReviewApi.summary()).toEqual(summary)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/customer/reviews/summary', { signal: undefined })
  authorizedAxios.get.mockResolvedValue(ok({ ...summary, averageStars: 5 }))
  await expect(customerReviewApi.summary()).rejects.toThrow('customerReviews.invalidResponse')
})
it('rejects unsupported paging, malformed envelopes and owner/external image paths', async () => {
  await expect(customerReviewApi.list({ take: 21 })).rejects.toThrow()
  expect(authorizedAxios.get).not.toHaveBeenCalled()
  authorizedAxios.get.mockResolvedValue(ok({ items: [{ ...row, imageUrls: ['/uploads/private-owner/file.jpg'] }], total: 1, page: 1, take: 4, hasMore: false }))
  await expect(customerReviewApi.list()).rejects.toThrow()
  await expect(customerReviewApi.image(id, 'https://untrusted.test/image.png')).rejects.toThrow()
  expect(authorizedAxios.get).toHaveBeenCalledTimes(1)
})
it('fetches protected image blobs through the authenticated API and rejects error or SVG bodies', async () => {
  vi.stubGlobal('Blob', BinaryBlob)
  try {
    const blob = new BinaryBlob(['image'], { type: 'image/png' })
    authorizedAxios.get.mockResolvedValue({ data: blob })
    expect(await customerReviewApi.image(id, row.imageUrls[0])).toBe(blob)
    expect(authorizedAxios.get).toHaveBeenCalledWith(row.imageUrls[0], { responseType: 'blob', signal: undefined })
    for (const type of ['application/json', 'image/svg+xml']) {
      authorizedAxios.get.mockResolvedValue({ data: new BinaryBlob(['error'], { type }) })
      await expect(customerReviewApi.image(id, row.imageUrls[0])).rejects.toThrow()
    }
  } finally {
    vi.unstubAllGlobals()
  }
})
