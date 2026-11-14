import authorizedAxios from '~/utils/authorizedAxios'
import { CUSTOMER_REVIEWS } from '~/utils/constants'

const invalid = () => new Error('customerReviews.invalidResponse')
const count = value => Number.isSafeInteger(value) && value >= 0
const score = value => Number.isInteger(value) && value >= 1 && value <= 5
const idPattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
const unwrap = ({ data }) => {
  if (data?.succeeded !== true || !data.data) {
    throw invalid()
  }
  return data.data
}
const imageIndex = (id, path) => {
  if (!idPattern.test(id || '') || typeof path !== 'string' || !path.startsWith(`${CUSTOMER_REVIEWS.ENDPOINT}/${id}/images/`)) {
    throw invalid()
  }
  const index = path.slice(`${CUSTOMER_REVIEWS.ENDPOINT}/${id}/images/`.length)
  if (!/^(0|[1-9]\d*)$/.test(index) || !count(Number(index))) {
    throw invalid()
  }
  return Number(index)
}
const review = value => {
  if (!idPattern.test(value?.id || '') || !score(value.overallStars) || !(value.comment == null || typeof value.comment === 'string') || !Number.isFinite(Date.parse(value.publishedAt)) || !Array.isArray(value.imageUrls)) {
    throw invalid()
  }
  value.imageUrls.forEach(path => imageIndex(value.id, path))
  // Only the public DTO enters the UI; never expose identity/order fields from a future response.
  return { id: value.id, overallStars: value.overallStars, comment: value.comment, publishedAt: value.publishedAt, imageUrls: value.imageUrls }
}
export const customerReviewApi = {
  list: async ({ page = 1, take = CUSTOMER_REVIEWS.TAKE, stars } = {}, signal) => {
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(take) || take < 1 || take > CUSTOMER_REVIEWS.MAX_TAKE || stars !== undefined && !score(stars)) {
      throw invalid()
    }
    const value = unwrap(await authorizedAxios.get(CUSTOMER_REVIEWS.ENDPOINT, { params: { page, take, ...(stars === undefined ? {} : { stars }) }, signal }))
    if (!Array.isArray(value.items) || !count(value.total) || value.page !== page || value.take !== take || value.hasMore !== (page * take < value.total)) {
      throw invalid()
    }
    return { list: value.items.map(review), total: value.total, page, take, hasMore: value.hasMore }
  },
  summary: async signal => {
    const value = unwrap(await authorizedAxios.get(`${CUSTOMER_REVIEWS.ENDPOINT}/summary`, { signal }))
    if (!count(value.total) || !(value.total === 0 ? value.averageStars === null : Number.isFinite(value.averageStars) && value.averageStars >= 1 && value.averageStars <= 5) || !Array.isArray(value.distribution) || value.distribution.length !== 5 || new Set(value.distribution.map(row => row.stars)).size !== 5 || value.distribution.some(row => !score(row.stars) || !count(row.count) || !Number.isFinite(row.rate) || row.rate < 0 || row.rate > 100) || value.distribution.reduce((sum, row) => sum + row.count, 0) !== value.total) {
      throw invalid()
    }
    return { total: value.total, averageStars: value.averageStars, distribution: value.distribution.map(({ stars, count, rate }) => ({ stars, count, rate })) }
  },
  image: async (id, path, signal) => {
    const index = imageIndex(id, path)
    const { data } = await authorizedAxios.get(`${CUSTOMER_REVIEWS.ENDPOINT}/${id}/images/${index}`, { responseType: 'blob', signal })
    if (!(data instanceof Blob) || !data.size || data.size > CUSTOMER_REVIEWS.MAX_IMAGE_BYTES || !['image/jpeg', 'image/png', 'image/webp'].includes(data.type.split(';')[0].toLowerCase())) {
      throw invalid()
    }
    return data
  }
}
