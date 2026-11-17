import { ORDER_STATUS_OPTIONS } from '~/utils/config/constants'

export const PAGE_SIZE = 12
export const statusLabel = (status) => ORDER_STATUS_OPTIONS.find((item) => Number(item.value) === status)?.label || 'customer.orders.unknown'
export const processingSteps = (order) => {
  const next = { 3: 4, 4: 5, 5: 6, 6: 7, 7: 8 }[order.status]
  const allowed = order.allowedActions?.allowedNextStatuses
  return next && Array.isArray(allowed) && allowed.includes(next) ? [next] : []
}
export const canWeigh = (order) => order.allowedActions?.canUpdateWeight === true
export const assignmentTask = (order) => order.allowedActions?.canAssignShipper === true && [1, 2].includes(order.allowedActions.assignTaskType) ? order.allowedActions.assignTaskType : null
export const validWeight = (value) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 1000
export const sameOrderState = (before, after) => Number.isSafeInteger(before.revision) && before.revision === after.revision && ['status', 'paymentStatus', 'actualWeightKg', 'finalAmount', 'shipperId', 'assignedTaskType'].every((key) => before[key] === after[key])
