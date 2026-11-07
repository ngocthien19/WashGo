import { merchantOrderApi } from './merchantOrderApi'
import { ORDER_STATUSES } from '~/utils/constants'
import { dateRangeFilter } from '~/utils/dateRange'
import { previousRange, reportBuckets, REPORT_LIMITS, validReportRange } from '~/pages/merchant/Reports/reportModel'

// Counts are scoped by the backend JWT. No order rows, PINs or customer data leave this adapter.
export const merchantReportApi = {
  load: async (range, signal) => {
    if (!validReportRange(range.from, range.to)) {
      throw new Error('merchant.reports.invalidRange')
    }
    const previous = previousRange(range)
    const buckets = reportBuckets(range)
    const jobs = new Map()
    const count = (filter) => {
      const key = JSON.stringify(filter)
      if (!jobs.has(key)) {
        jobs.set(key, { filter })
      }
      return key
    }
    const summary = (period) => ({ total: count(dateRangeFilter(period)), completed: count({ ...dateRangeFilter(period), status: ORDER_STATUSES.COMPLETED }) })
    const currentKeys = summary(range), previousKeys = summary(previous)
    const bucketKeys = buckets.map((bucket) => ({ ...bucket, current: count(bucket.current), previous: count(bucket.previous) }))
    const queue = [...jobs.values()]
    let cursor = 0
    let failed = false
    const worker = async () => {
      while (cursor < queue.length && !failed && !signal?.aborted) {
        const job = queue[cursor++]
        try {
          job.total = (await merchantOrderApi.list({ ...job.filter, page: 1, take: 1 }, signal)).total
        } catch (error) {
          failed = true; throw error
        }
      }
    }
    const results = await Promise.allSettled(Array.from({ length: Math.min(REPORT_LIMITS.CONCURRENCY, queue.length) }, worker))
    const rejection = results.find((result) => result.status === 'rejected')
    if (rejection) {
      throw rejection.reason
    }
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    const read = (keys) => Object.fromEntries(Object.entries(keys).map(([key, id]) => [key, jobs.get(id).total]))
    return { range: { ...range }, previousRange: previous, current: read(currentKeys), previous: read(previousKeys), buckets: bucketKeys.map((bucket) => ({ key: bucket.key, label: bucket.label, current: jobs.get(bucket.current).total, previous: jobs.get(bucket.previous).total })) }
  }
}
