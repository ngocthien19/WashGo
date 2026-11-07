export const ORDER_GROUPS = [
  { key: 'incoming', statuses: [1, 2, 3], color: '#3b82f6' },
  { key: 'processing', statuses: [4, 5, 6, 7], color: '#8b5cf6' },
  { key: 'payment', statuses: [8, 9], color: '#f59e0b' },
  { key: 'pickup', statuses: [10, 11], color: '#06b6d4' },
  { key: 'completed', statuses: [12], color: '#10b981' },
  { key: 'storage', statuses: [13], color: '#f97316' },
  { key: 'cancelled', statuses: [99], color: '#f43f5e' }
]
export const groupOrders = (counts) => ORDER_GROUPS.map((group) => ({ ...group, value: group.statuses.reduce((sum, status) => sum + (counts[status] || 0), 0) }))

export const orderStatusCounts = (value) => Object.fromEntries([
  'pending', 'deposited', 'collected', 'washing', 'drying', 'ironing', 'folding', 'awaitingPayment', 'paid', 'readyToReturn', 'returned', 'completed', 'movedToStorage', 'cancelled'
].map((key, index) => {
  if (!Number.isInteger(value?.[key]) || value[key] < 0) {
    throw new Error('merchant.invalidResponse')
  }
  return [index === 13 ? 99 : index + 1, value[key]]
}))
