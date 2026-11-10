import { validRange, dateRangeFilter } from '~/utils/dateRange'

export const HISTORY_TAKE = 12
export function readHistoryQuery(params) {
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const validDates = validRange(from, to)
  const requestedPage = params.get('page') || '1'
  return {
    from: validDates ? from : '',
    to: validDates ? to : '',
    taskType: ['1', '2'].includes(params.get('taskType')) ? params.get('taskType') : '',
    page: /^[1-9]\d{0,5}$/.test(requestedPage) ? Number(requestedPage) : 1,
    invalidDates: !validDates
  }
}
export const historyFilter = (query) => ({ ...dateRangeFilter(query), taskType: query.taskType ? Number(query.taskType) : undefined, page: query.page, take: HISTORY_TAKE })
export const historyParams = (query) => Object.fromEntries(['from', 'to', 'taskType', 'page'].filter((key) => query[key] !== '' && !(key === 'page' && query.page === 1)).map((key) => [key, String(query[key])]))
