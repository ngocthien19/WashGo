import { RATING_CONFIG } from '~/utils/constants'

export const getRatingError = (values) => {
  if (!Number.isInteger(values.overallStars) || values.overallStars < 1 || values.overallStars > RATING_CONFIG.MAX_STARS) {
    return 'customer.rating.starsRequired'
  }
  if (RATING_CONFIG.CRITERIA.some((key) => values[key] != null && (!Number.isInteger(values[key]) || values[key] < 1 || values[key] > RATING_CONFIG.MAX_STARS))) {
    return 'customer.rating.starsRequired'
  }
  return values.comment.trim().length > RATING_CONFIG.COMMENT_MAX ? 'customer.rating.commentTooLong' : ''
}
