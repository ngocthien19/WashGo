export const eventKeys = [
  'OrderCreated', 'MerchantAssigned', 'ShipperAssigned', 'ShipperReassigned', 'ShipperUnassigned', 'ReturnReadyConfirmed', 'Deposited',
  'ShipperCollected', 'ActualWeightConfirmed', 'StatusChanged', 'LaundryPaid', 'CancellationFeePaid',
  'StorageFeePaid', 'ShipperReturned', 'Returned', 'Completed', 'Cancelled', 'CancelledGoodsReturned',
  'AccessCodesRevealed', 'OrderNote', 'Storage.Assign', 'Storage.collect', 'Storage.handover',
  'Storage.depart', 'Storage.place', 'Storage.RequestReturn', 'Storage.cancel-return',
  'Storage.cancel-assignment', 'Storage.exception', 'Storage.verify-legacy', 'Storage.LegacyMoved',
  'Storage.SystemUnpaidAtShop'
]

export const capturedEvent = entry => entry.basis !== 'Legacy' && entry.eventType && entry.eventType !== 'Legacy'
export const eventKey = entry => capturedEvent(entry) && eventKeys.includes(entry.eventType) ? entry.eventType.replaceAll('.', '_') : 'Unknown'

// Captured responses are already ordered by the server's per-order sequence.
// Timestamp sorting is only a compatibility fallback for responses without event metadata.
export const orderedEvents = (entries = []) => entries.some(entry => entry.eventType || entry.sequence != null || entry.basis)
  ? [...entries] : [...entries].sort((a, b) => a.timestamp - b.timestamp)

export const milestoneEvents = entries => orderedEvents(entries).filter(entry => !capturedEvent(entry)
  || entry.eventType === 'OrderCreated' || entry.fromStatus != null && entry.fromStatus !== entry.status)
