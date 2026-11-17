import { ORDER_STATUSES, PAYMENT_STATUSES } from '~/utils/config/constants'

export const ORDER_DEADLINES = [
  { key: 'deposit', field: 'depositDeadline', flag: 'isDepositExpired', active: order => order.status === ORDER_STATUSES.PENDING },
  { key: 'payment', field: 'paymentDeadline', flag: 'isPaymentOverdue', active: order => order.status === ORDER_STATUSES.AWAITING_PAYMENT && order.paymentStatus === PAYMENT_STATUSES.UNPAID },
  { key: 'pickup', field: 'pickupDeadline', flag: 'isPickupOverdue', active: order => order.status === ORDER_STATUSES.READY_TO_RETURN }
]

export function orderDeadline(order, definition, elapsed = 0) {
  const active = definition.active(order)
  const deadline = Date.parse(order[definition.field])
  const server = Date.parse(order.serverNow)
  const seconds = Number.isFinite(deadline) && Number.isFinite(server) ? (deadline - server - Math.max(0, elapsed)) / 1000 : null
  return {
    active,
    date: Number.isFinite(deadline) ? order[definition.field] : null,
    seconds: active ? seconds : null,
    expired: active && (order[definition.flag] === true || seconds != null && seconds <= 0)
  }
}
