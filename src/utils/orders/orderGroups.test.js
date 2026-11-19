import { expect, it } from 'vitest'
import { ORDER_COUNT_FIELDS, ORDER_GROUPS, orderStatusCounts, groupOrders } from './orderGroups'
import { ORDER_WORKFLOW } from '~/utils/config/constants'

it('maps all BE summary fields without treating cancellation as enum 20', () => {
  const raw = Object.fromEntries(Object.keys(ORDER_COUNT_FIELDS).map((key, index) => [key, index + 1]))
  const counts = orderStatusCounts(raw)
  expect(counts[16]).toBe(16)
  expect(counts[19]).toBe(19)
  expect(counts[99]).toBe(20)
  expect(counts).not.toHaveProperty('20')
  const statuses = ORDER_GROUPS.flatMap(group => group.statuses)
  expect(new Set(statuses).size).toBe(statuses.length)
  expect(statuses.toSorted((a, b) => a - b)).toEqual(Object.values(ORDER_COUNT_FIELDS).toSorted((a, b) => a - b))
  expect(groupOrders(counts).reduce((sum, group) => sum + group.value, 0)).toBe(Object.values(raw).reduce((sum, count) => sum + count, 0))
  expect(() => orderStatusCounts({ ...raw, returnShipperAssigned: -1 })).toThrow()
})

it('orders collection and return milestones by business flow instead of enum number', () => {
  expect(ORDER_WORKFLOW.map(step => Number(step.value))).toEqual([1, 2, 16, 17, 3, 4, 5, 6, 7, 8, 9, 18, 19, 10, 11, 12])
})
