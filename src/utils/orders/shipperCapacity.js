export const hasShipperCapacity = row => Number.isSafeInteger(row?.activeTaskCount) && row.activeTaskCount >= 0
  && Number.isSafeInteger(row.maxActiveTasks) && row.maxActiveTasks > 0
  && Number.isSafeInteger(row.remainingTaskCapacity) && row.remainingTaskCapacity === Math.max(0, row.maxActiveTasks - row.activeTaskCount)

// The same assignment may remain selectable at capacity; only BE knows which task is being replaced.
export const canAssignShipper = row => hasShipperCapacity(row) && row.canAssign === true
export const shipperBlockedKey = row => `shipperCapacity.reasons.${['AccountInactive', 'ShipperOnLeave', 'ShipperNotAvailable', 'ShipperCapacityExceeded'].includes(row?.blockedReasonCode) ? row.blockedReasonCode : 'Unavailable'}`
export const isShipperCapacityConflict = error => error.response?.status === 409 && error.response?.data?.meta?.code === 'ShipperCapacityExceeded'
