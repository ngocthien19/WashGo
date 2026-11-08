import { ORDER_STATUS_OPTIONS } from '~/utils/constants'

export const PAGE_SIZE = 12
export const statusLabel = (status) => ORDER_STATUS_OPTIONS.find((item) => Number(item.value) === status)?.label || 'customer.orders.unknown'
export const processingSteps = (order) => {
  return Array.isArray(order.allowedActions?.allowedNextStatuses) ? order.allowedActions.allowedNextStatuses.filter((value) => [4, 5, 6, 7, 8].includes(value)) : []
}
export const canWeigh = (order) => order.allowedActions?.canUpdateWeight === true
export const assignmentTask = (order) => order.allowedActions?.canAssignShipper === true && [1, 2].includes(order.allowedActions.assignTaskType) ? order.allowedActions.assignTaskType : null
export const validWeight = (value) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 1000
export const sameOrderState = (before, after) => Number.isSafeInteger(before.revision) && before.revision === after.revision && ['status', 'paymentStatus', 'actualWeightKg', 'finalAmount', 'shipperId', 'assignedTaskType'].every((key) => before[key] === after[key])
