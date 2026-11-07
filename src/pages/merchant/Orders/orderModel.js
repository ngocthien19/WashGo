import { ORDER_STATUS_OPTIONS } from '~/utils/constants'

export const PAGE_SIZE = 12
export const statusLabel = (status) => ORDER_STATUS_OPTIONS.find((item) => Number(item.value) === status)?.label || 'customer.orders.unknown'
export const processingSteps = (order) => {
  const steps = { 3: [4], 4: [5, 6, 7, 8], 5: [6, 7, 8], 6: [7, 8], 7: [8] }[order.status] || []
  return order.includedWeightKg > 0 && order.actualWeightKg == null ? steps.filter((value) => ![4, 8].includes(value)) : steps
}
export const canWeigh = (order) => order.status === 3 && order.paymentStatus === 1 && order.includedWeightKg > 0 && Number.isFinite(order.baseProcessingHours) && order.items.some((item) => item.isWeightBased)
export const assignmentTask = (order) => order.status === 2 ? 1 : (order.status === 9 && order.paymentStatus === 2) || (order.status === 99 && order.cancelledGoodsStatus === 2) ? 2 : null
export const validWeight = (value) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 1000
export const sameOrderState = (before, after) => ['status', 'paymentStatus', 'actualWeightKg', 'finalAmount', 'shipperId', 'assignedTaskType'].every((key) => before[key] === after[key])
