import { describe, expect, it } from 'vitest'
import { getRatingError } from './ratingModel'

describe('customer rating validation', () => {
  it('requires an overall star rating and accepts optional criteria only in range', () => {
    expect(getRatingError({ overallStars: 0, comment: '' })).toBe('customer.rating.starsRequired')
    expect(getRatingError({ overallStars: 5, comment: '', qualityStars: null })).toBe('')
    expect(getRatingError({ overallStars: 5, comment: '', qualityStars: 6 })).toBe('customer.rating.starsRequired')
    expect(getRatingError({ overallStars: 2.5, comment: '' })).toBe('customer.rating.starsRequired')
    expect(getRatingError({ overallStars: 4, comment: 'x'.repeat(1001) })).toBe('customer.rating.commentTooLong')
    expect(getRatingError({ overallStars: 4, comment: 'x'.repeat(1000), qualityStars: 1 })).toBe('')
  })
})
