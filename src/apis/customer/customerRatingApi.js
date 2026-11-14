import authorizedAxios from '~/utils/http/authorizedAxios'
import { RATING_CONFIG } from '~/utils/config/constants'

const unwrap = ({ data }, orderId, allowEmpty) => {
  if (data?.succeeded !== true) {
    throw new Error(data?.message || 'customer.rating.invalidResponse')
  }
  const rating = data.data
  if (rating === null && allowEmpty) {
    return null
  }
  if (!rating?.id || rating.orderId !== orderId || !Number.isInteger(rating.overallStars)
    || rating.overallStars < 1 || rating.overallStars > RATING_CONFIG.MAX_STARS) {
    throw new Error('customer.rating.invalidResponse')
  }
  return Object.fromEntries(['id', 'orderId', 'orderCode', 'overallStars', 'qualityStars', 'speedStars', 'attitudeStars', 'packagingStars', 'comment', 'imageUrls', 'videoUrls', 'isVisible', 'createdOn'].filter(key => rating[key] !== undefined).map(key => [key, rating[key]]))
}

export const customerRatingApi = {
  operation: async (operationId, orderId) => {
    const { data } = await authorizedAxios.get(`${RATING_CONFIG.ENDPOINT}/operations/${encodeURIComponent(operationId)}`)
    const value = data?.data
    if (data?.succeeded !== true || value?.operationId !== operationId || value.state !== 'Completed' || value.action !== 'Create' || value.resourceId !== orderId) {
      throw new Error('customer.rating.invalidResponse')
    }
    return unwrap({ data: value.result }, orderId, false)
  },
  getByOrder: (orderId, signal) => authorizedAxios.get(`${RATING_CONFIG.ENDPOINT}/order/${encodeURIComponent(orderId)}`, { signal })
    .then((response) => unwrap(response, orderId, true)),
  create: ({ orderId, overallStars, qualityStars, speedStars, attitudeStars, packagingStars, comment, imageUrls, videoUrls, operationId }) =>
    authorizedAxios.post(RATING_CONFIG.ENDPOINT, { orderId, overallStars, qualityStars, speedStars, attitudeStars, packagingStars, comment, imageUrls, videoUrls, operationId })
      .then((response) => unwrap(response, orderId, false))
}
