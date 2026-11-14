import { useEffect, useState } from 'react'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import { ORDER_LIST, ORDER_STATUSES } from '~/utils/config/constants'

// The list DTO currently omits prediction fields. Enrich only the visible page.
export default function useOrderEstimates(orders) {
  const [result, setResult] = useState(null)
  useEffect(() => {
    if (!orders?.length) {
      return
    }
    const controller = new AbortController()
    const queue = orders.slice(0, ORDER_LIST.PAGE_SIZE).filter((order) => order.status !== ORDER_STATUSES.CANCELLED && !order.predictionStatus)
    let cursor = 0
    const worker = async () => {
      while (!controller.signal.aborted && cursor < queue.length) {
        const order = queue[cursor++]
        try {
          const detail = await customerOrderApi.get(order.id, controller.signal)
          if (detail.id !== order.id || !['predicted', 'rule', 'done', 'notApplicable'].includes(detail.predictionStatus)) {
            throw new Error('customer.orders.invalidResponse')
          }
          if (!controller.signal.aborted) {
            const recorded = detail.status === order.status ? (detail.timeline || []).filter((event) => event.status === order.status && Number.isFinite(event.timestamp) && event.timestamp > 0).map((event) => event.timestamp) : []
            const estimate = { predictedFinishAt: detail.predictedFinishAt, predictionStatus: detail.predictionStatus, predictionUpdatedAt: detail.predictionUpdatedAt, recordedAt: recorded.length ? Math.max(...recorded) : null }
            setResult((previous) => ({ orders, values: { ...(previous?.orders === orders ? previous.values : {}), [order.id]: estimate } }))
          }
        } catch {
          if (!controller.signal.aborted) {
            setResult((previous) => ({ orders, values: { ...(previous?.orders === orders ? previous.values : {}), [order.id]: null } }))
          }
        }
      }
    }
    void Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker))
    return () => controller.abort()
  }, [orders])
  return result && result.orders === orders ? result.values : {}
}
