import { useSyncExternalStore } from 'react'

// Keep unresolved commands across list/detail navigation, only in this browser session's memory.
let pending = null
const listeners = new Set()
const subscribe = listener => {
  listeners.add(listener); return () => listeners.delete(listener)
}
const snapshot = () => pending
const update = value => {
  pending = value; listeners.forEach(listener => listener())
}
export default function useReviewOperation() {
  return [useSyncExternalStore(subscribe, snapshot), update]
}

let selectedReview = null
export const rememberReview = row => {
  selectedReview = row
}
export const reviewSnapshot = id => selectedReview?.id === id ? selectedReview : null
