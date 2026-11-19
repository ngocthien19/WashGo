export const ORDER_GROUPS = [
  { key: 'pending', statuses: [1], color: '#64748b' },
  { key: 'incoming', statuses: [2, 16, 17], color: '#3b82f6' },
  { key: 'processing', statuses: [3, 4, 5, 6, 7], color: '#8b5cf6' },
  { key: 'payment', statuses: [8], color: '#f59e0b' },
  { key: 'returnPreparation', statuses: [9], color: '#84cc16' },
  { key: 'returnDispatch', statuses: [18, 19], color: '#14b8a6' },
  { key: 'pickup', statuses: [10], color: '#06b6d4' },
  { key: 'completed', statuses: [11, 12], color: '#10b981' },
  { key: 'storage', statuses: [13, 14, 15], color: '#f97316' },
  { key: 'cancelled', statuses: [99], color: '#f43f5e' }
]
export const groupOrders = (counts) => ORDER_GROUPS.map((group) => ({ ...group, value: group.statuses.reduce((sum, status) => sum + (counts[status] || 0), 0) }))

// Explicit enum mapping: the new assignment statuses are not in numeric workflow order.
export const ORDER_COUNT_FIELDS = {
  pending: 1, deposited: 2, collected: 3, washing: 4, drying: 5, ironing: 6,
  folding: 7, awaitingPayment: 8, paid: 9, readyToReturn: 10, returned: 11,
  completed: 12, movedToStorage: 13, transferringToStorage: 14, returningFromStorage: 15,
  merchantAssigned: 16, collectionShipperAssigned: 17, readyForReturnDispatch: 18,
  returnShipperAssigned: 19, cancelled: 99
}
export const orderStatusCounts = (value) => Object.fromEntries(Object.entries(ORDER_COUNT_FIELDS).map(([key, status]) => {
  // Older summary snapshots did not include these fields. A missing value is zero,
  // while the caller still checks the sum against the authoritative total.
  if ([14, 15, 16, 17, 18, 19].includes(status) && value?.[key] === undefined) {
    return [status, 0]
  }
  if (!Number.isInteger(value?.[key]) || value[key] < 0) {
    throw new Error('merchant.invalidResponse')
  }
  return [status, value[key]]
}))
