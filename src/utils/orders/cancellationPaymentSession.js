// A UI hint only: the backend remains responsible for session ownership and reuse.
// Never store tokens, gateway URLs or transaction references here.
const memory = new Map()
const unsaved = new Set()
const keyFor = (userId, orderId) => userId && orderId ? `washgo:cancellation-method:v1:${encodeURIComponent(userId)}:${encodeURIComponent(orderId)}` : null
const valid = value => value && typeof value.review === 'boolean' && ([2, 3].includes(value.method) || value.review && value.method === null)

export function readCancellationSession(userId, orderId) {
  const key = keyFor(userId, orderId)
  if (!key) {
    return null
  }
  let raw
  try {
    raw = localStorage.getItem(key)
  } catch {
    return memory.get(key) || null
  }
  if (!raw && unsaved.has(key)) {
    return memory.get(key) || null
  }
  try {
    const value = raw ? JSON.parse(raw) : null
    if (valid(value)) {
      memory.set(key, value); return value
    }
  } catch { /* Ignore malformed UI hints, including previously valid cached values. */ }
  memory.delete(key); unsaved.delete(key)
  return null
}

export function saveCancellationSession(userId, orderId, value) {
  const key = keyFor(userId, orderId)
  if (!key || !valid(value)) {
    return
  }
  const safe = { method: value.method, review: value.review }
  memory.set(key, safe)
  try {
    localStorage.setItem(key, JSON.stringify(safe))
    unsaved.delete(key)
  } catch {
    unsaved.add(key)
  }
}

export function clearCancellationSession(userId, orderId) {
  const key = keyFor(userId, orderId)
  if (!key) {
    return
  }
  memory.delete(key)
  unsaved.delete(key)
  try {
    localStorage.removeItem(key)
  } catch { /* Storage may be blocked. */ }
}
