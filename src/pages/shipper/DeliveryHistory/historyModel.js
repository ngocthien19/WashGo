import { validRange, dateRangeFilter } from '~/utils/dateRange'

export const HISTORY_TAKE = 12
export function readHistoryQuery(params) {
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const validDates = validRange(from, to) && (!from || !to || (Date.parse(to) - Date.parse(from)) / 86400000 < 366)
  const requestedPage = params.get('page') || '1'
  return {
    keyword: (params.get('keyword') || '').trim().slice(0, 200),
    lockerId: /^[a-f0-9-]{36}$/i.test(params.get('lockerId') || '') ? params.get('lockerId') : '',
    cancelledReturn: ['true', 'false'].includes(params.get('cancelledReturn')) ? params.get('cancelledReturn') : '',
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
    from: validDates ? from : '',
    to: validDates ? to : '',
    taskType: ['1', '2'].includes(params.get('taskType')) ? params.get('taskType') : '',
    page: /^[1-9]\d{0,5}$/.test(requestedPage) ? Number(requestedPage) : 1,
    invalidDates: !validDates
  }
}
export const historyFilter = (query) => ({ ...dateRangeFilter(query), keyword: query.keyword || undefined, lockerId: query.lockerId || undefined, cancelledReturn: query.cancelledReturn ? query.cancelledReturn === 'true' : undefined, sortBy: [{ field: 'CompletedAt', isDescending: query.sort !== 'oldest' }], taskType: query.taskType ? Number(query.taskType) : undefined, page: query.page, take: HISTORY_TAKE })
export const historyParams = (query) => Object.fromEntries(['keyword', 'lockerId', 'cancelledReturn', 'sort', 'from', 'to', 'taskType', 'page'].filter((key) => query[key] !== '' && query[key] !== undefined && !(key === 'page' && query.page === 1)).map((key) => [key, String(query[key])]))
