import { ORDER_STATUSES, ORDER_WORKFLOW, PAYMENT_STATUSES } from '~/utils/constants'

export const getOrderProgress = (order) => {
  const isStep = (status) => ORDER_WORKFLOW.some((step) => Number(step.value) === status)
  const latest = [...(order.timeline || [])].sort((a, b) => b.timestamp - a.timestamp).find((event) => isStep(event.status))?.status
  const status = isStep(order.status) ? order.status : order.cancellationFromStatus || latest
  const index = ORDER_WORKFLOW.findIndex((step) => Number(step.value) === status)
  return index < 0 ? null : Math.round(index / (ORDER_WORKFLOW.length - 1) * 100)
}

export const canPrintReceipt = (order) => order.status === ORDER_STATUSES.COMPLETED && order.paymentStatus === PAYMENT_STATUSES.PAID
