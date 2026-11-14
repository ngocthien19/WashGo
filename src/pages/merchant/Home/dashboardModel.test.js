import { expect, it } from 'vitest'
import { groupOrders } from './dashboardModel'

it('separates processing, payment, pickup and terminal states without counting one status twice', () => {
  const groups = groupOrders({ 2: 3, 4: 2, 5: 1, 8: 5, 10: 2, 12: 10, 13: 1, 99: 4 })
  expect(Object.fromEntries(groups.map(({ key, value }) => [key, value]))).toEqual({ incoming: 3, processing: 3, payment: 5, pickup: 2, completed: 10, storage: 1, cancelled: 4 })
  expect(groups.reduce((sum, group) => sum + group.value, 0)).toBe(28)
})

it('includes storage transit states in storage totals', () => {
  const storage = groupOrders({ 13: 1, 14: 2, 15: 3 }).find(group => group.key === 'storage')
  expect(storage.value).toBe(6)
})
