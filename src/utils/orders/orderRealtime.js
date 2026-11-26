const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
const changes = new Set(['OrderCreated', 'OrderUpdated', 'StatusChanged', 'MerchantChanged', 'AssignmentChanged', 'ActualsChanged', 'PaymentChanged', 'StorageChanged'])

export function createOrderRealtimeStore() {
  const listeners = new Set(), seen = new Set(), revisions = new Map(), versions = new Map(), dirty = new Set()
  let epoch = 0, listVersion = 0, eventVersion = 0, scopeVersion = 0, timer, all = false, scope = false
  const remember = (map, key, value) => {
    map.delete(key); map.set(key, value)
    if (map.size > 1000) {
      map.delete(map.keys().next().value)
    }
  }
  const flush = () => {
    timer = undefined
    listVersion++
    if (all) {
      epoch++
    }
    if (scope || dirty.size) {
      eventVersion++
    }
    if (scope) {
      scopeVersion++
    }
    for (const id of dirty) {
      remember(versions, id, (versions.get(id) || 0) + 1)
    }
    dirty.clear(); all = false; scope = false
    for (const listener of listeners) {
      listener()
    }
  }
  const schedule = () => {
    timer ??= setTimeout(flush, 200)
  }
  const accept = event => {
    if (!uuid.test(event?.eventId || '') || !Number.isFinite(Date.parse(event.occurredAt)) || seen.has(event.eventId)) {
      return false
    }
    seen.add(event.eventId)
    if (seen.size > 2000) {
      seen.delete(seen.values().next().value)
    }
    return true
  }
  return {
    subscribe: listener => {
      listeners.add(listener); return () => listeners.delete(listener)
    },
    snapshot: id => id ? `${epoch}:${versions.get(id) || 0}` : `${epoch}:${listVersion}`,
    eventSnapshot: id => id ? `${scopeVersion}:${versions.get(id) || 0}` : `${scopeVersion}:${eventVersion}`,
    changed: event => {
      if (!uuid.test(event?.orderId || '') || !Number.isSafeInteger(event.revision) || event.revision < 0 || !changes.has(event.changeType) || !accept(event)) {
        return
      }
      if (event.revision < (revisions.get(event.orderId) ?? -1)) {
        return
      }
      remember(revisions, event.orderId, event.revision)
      // Equal revisions can describe new payment/assignment child records.
      dirty.add(event.orderId); schedule()
    },
    scopeChanged: event => {
      if (accept(event)) {
        all = true; scope = true; schedule()
      }
    },
    revalidate: () => {
      all = true; schedule()
    },
    dispose: () => {
      clearTimeout(timer); timer = undefined; all = false; scope = false; listeners.clear(); seen.clear(); revisions.clear(); versions.clear(); dirty.clear()
    }
  }
}
