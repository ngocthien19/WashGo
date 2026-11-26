import { createContext, useCallback, useContext, useState, useSyncExternalStore } from 'react'

export const OrderRealtimeContext = createContext(null)
const subscribeEmpty = () => () => {}
export function useOrderChangedSinceOpen(orderId) {
  const store = useContext(OrderRealtimeContext)
  const snapshot = useCallback(() => store?.eventSnapshot(orderId) || '0:0', [store, orderId])
  const revision = useSyncExternalStore(store?.subscribe || subscribeEmpty, snapshot, snapshot)
  const [openedAt] = useState(revision)
  return revision !== openedAt
}
export default function useOrderRealtime(orderId) {
  const store = useContext(OrderRealtimeContext)
  const snapshot = useCallback(() => store?.snapshot(orderId) || '0:0', [store, orderId])
  return useSyncExternalStore(store?.subscribe || subscribeEmpty, snapshot, snapshot)
}
