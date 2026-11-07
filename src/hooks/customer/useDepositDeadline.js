import { useEffect, useState } from 'react'

export const depositTime = (order, elapsed = 0) => {
  const deadline = Date.parse(order?.depositDeadline)
  const server = Date.parse(order?.serverNow)
  if (!Number.isFinite(deadline) || !Number.isFinite(server)) {
    return { available: false, expired: order?.isDepositExpired === true }
  }
  const seconds = Math.max(0, Math.ceil((deadline - server - elapsed) / 1000))
  return { available: true, seconds, expired: order.isDepositExpired === true || seconds === 0 }
}

export default function useDepositDeadline(order) {
  const [clock, setClock] = useState(() => ({ order, received: performance.now(), elapsed: 0 }))
  useEffect(() => {
    const received = performance.now()
    const timer = setInterval(() => setClock({ order, received, elapsed: performance.now() - received }), 1000)
    return () => clearInterval(timer)
  }, [order])
  return depositTime(order, clock.order === order ? clock.elapsed : 0)
}
