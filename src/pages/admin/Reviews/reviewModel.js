import * as yup from 'yup'
import { isId } from '~/pages/admin/Merchants/merchantModel'
import { dateRangeFilter, validRange } from '~/utils/format/dateRange'

export const REVIEW_TAKE = 12
export const readReviewQuery = params => {
  const from = params.get('from') || '', to = params.get('to') || ''
  const page = Number(params.get('page'))
  return {
    keyword: (params.get('keyword') || '').trim().slice(0, 100),
    merchantId: isId(params.get('merchantId')) ? params.get('merchantId') : '',
    stars: ['1', '2', '3', '4', '5'].includes(params.get('stars')) ? params.get('stars') : '',
    isHidden: ['true', 'false'].includes(params.get('isHidden')) ? params.get('isHidden') : '',
    from: validRange(from, to) ? from : '', to: validRange(from, to) ? to : '',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1
  }
}
export const writeReviewQuery = query => Object.fromEntries(Object.entries(query).filter(([key, value]) => value !== '' && !(key === 'page' && value === 1)))
export const reviewFilter = query => ({ keyword: query.keyword || undefined, merchantId: query.merchantId || undefined, stars: query.stars ? Number(query.stars) : undefined, isHidden: query.isHidden === '' ? undefined : query.isHidden === 'true', ...dateRangeFilter(query), page: query.page, take: REVIEW_TAKE })
export const canModerate = (row, hidden) => typeof row?.version === 'string' && !!row.version.trim() && row.isHidden !== hidden && row[hidden ? 'canHide' : 'canShow'] === true
export const reviewActionSchema = hidden => yup.object({
  reason: hidden ? yup.string().trim().required('admin.reviews.reasonRequired').max(500, 'admin.reviews.reasonLong') : yup.string().trim().max(500, 'admin.reviews.reasonLong'),
  confirmed: yup.boolean().oneOf([true], 'admin.reviews.confirmRequired')
})

export const canPublishReview = row => typeof row?.version === 'string' && !!row.version.trim() && row.canPublish === true && !row.isHidden && !row.contentApprovedAt
export const canPublishForCustomers = row => typeof row?.version === 'string' && !!row.version.trim() && row.canPublishForCustomers === true && !row.isHidden && !row.publicApprovedAt
