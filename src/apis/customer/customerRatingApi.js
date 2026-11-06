import authorizedAxios from '~/utils/authorizedAxios'
import { RATING_CONFIG } from '~/utils/constants'

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
  return rating
}

export const customerRatingApi = {
  getByOrder: (orderId, signal) => authorizedAxios.get(`${RATING_CONFIG.ENDPOINT}/order/${encodeURIComponent(orderId)}`, { signal })
    .then((response) => unwrap(response, orderId, true)),
  create: ({ orderId, overallStars, qualityStars, speedStars, attitudeStars, packagingStars, comment, imageUrls }) =>
    authorizedAxios.post(RATING_CONFIG.ENDPOINT, { orderId, overallStars, qualityStars, speedStars, attitudeStars, packagingStars, comment, imageUrls })
      .then((response) => unwrap(response, orderId, false))
}
