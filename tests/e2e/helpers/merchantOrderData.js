export const mockOrderActions = (order) => ({
  allowedNextStatuses: order.status === 3 ? order.actualWeightKg == null ? [] : [4] : ({ 4: [5], 5: [6], 6: [7], 7: [8] }[order.status] || []),
  statusOptions: order.status === 3 && order.actualWeightKg == null ? [{ status: 4, allowed: false, reasonCode: 'WeightRequired' }] : [],
  canUpdateWeight: order.status === 3 && order.paymentStatus === 1,
  canConfirmReturnReady: order.status === 9 && order.paymentStatus === 2,
  canUnassignShipper: [17, 19].includes(order.status) && !!order.shipperId,
  canAssignShipper: [16, 17, 18, 19].includes(order.status),
  assignTaskType: [16, 17].includes(order.status) ? 1 : [18, 19].includes(order.status) ? 2 : null
})
export const mockStatusCounts = (counts) => Object.fromEntries(['pending', 'deposited', 'collected', 'washing', 'drying', 'ironing', 'folding', 'awaitingPayment', 'paid', 'readyToReturn', 'returned', 'completed', 'movedToStorage', 'transferringToStorage', 'returningFromStorage', 'merchantAssigned', 'collectionShipperAssigned', 'readyForReturnDispatch', 'returnShipperAssigned', 'cancelled'].map((key, i) => [key, counts[i === 19 ? 99 : i + 1] || 0]))
