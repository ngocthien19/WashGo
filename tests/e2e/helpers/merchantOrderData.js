export const mockOrderActions = (order) => ({
  allowedNextStatuses: order.status === 3 ? order.actualWeightKg == null ? [] : [4] : ({ 4: [5, 6, 7, 8], 5: [6, 7, 8], 6: [7, 8], 7: [8] }[order.status] || []),
  statusOptions: order.status === 3 && order.actualWeightKg == null ? [{ status: 4, allowed: false, reasonCode: 'WeightRequired' }] : [],
  canUpdateWeight: order.status === 3 && order.paymentStatus === 1,
  canAssignShipper: [2, 9].includes(order.status),
  assignTaskType: order.status === 2 ? 1 : order.status === 9 ? 2 : null
})
export const mockStatusCounts = (counts) => Object.fromEntries(['pending', 'deposited', 'collected', 'washing', 'drying', 'ironing', 'folding', 'awaitingPayment', 'paid', 'readyToReturn', 'returned', 'completed', 'movedToStorage', 'transferringToStorage', 'returningFromStorage', 'cancelled'].map((key, i) => [key, counts[i === 15 ? 99 : i + 1] || 0]))
