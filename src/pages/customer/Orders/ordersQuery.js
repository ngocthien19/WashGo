import { ORDER_LIST, ORDER_SORT_OPTIONS, ORDER_STATUS_OPTIONS, PAYMENT_STATUSES } from '~/utils/constants'

export const initialOrdersQuery = { keyword: '', status: '', paymentStatus: '', sort: ORDER_SORT_OPTIONS[0].value, page: 1 }

export const readOrdersQuery = (params) => {
  const status = params.get('status') || ''
  const paymentStatus = params.get('paymentStatus') || ''
  const sort = params.get('sort') || ''
  const page = Number(params.get('page'))
  return {
    keyword: params.get('keyword')?.trim() || '',
    status: ORDER_STATUS_OPTIONS.some((option) => option.value === status) ? status : '',
    paymentStatus: Object.values(PAYMENT_STATUSES).some((value) => String(value) === paymentStatus) ? paymentStatus : '',
    sort: ORDER_SORT_OPTIONS.some((option) => option.value === sort) ? sort : initialOrdersQuery.sort,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1
  }
}

export const writeOrdersQuery = (query) => {
  const params = new URLSearchParams()
  for (const key of ['keyword', 'status', 'paymentStatus']) {
    if (query[key]) {
      params.set(key, query[key])
    }
  }
  if (query.sort !== initialOrdersQuery.sort) {
    params.set('sort', query.sort)
  }
  if (query.page > 1) {
    params.set('page', String(query.page))
  }
  return params
}

export const buildOrdersFilter = (query) => ({
  page: query.page,
  take: ORDER_LIST.PAGE_SIZE,
  keyword: query.keyword || undefined,
  status: query.status ? Number(query.status) : undefined,
  paymentStatus: query.paymentStatus ? Number(query.paymentStatus) : undefined,
  sortBy: (ORDER_SORT_OPTIONS.find((option) => option.value === query.sort) || ORDER_SORT_OPTIONS[0]).sortBy
})
