import { expect, it } from 'vitest'
import { readTaskQuery, taskFilter, taskParams, taskSnapshot, canCompleteTask, matchesTaskQr, credentialSchema } from './taskModel'
it('normalizes task search/type/paging without inventing assignment-date filters', () => {
  const query = readTaskQuery(new URLSearchParams('keyword=WG&taskType=2&page=3'))
  expect(taskFilter(query)).toEqual({ keyword: 'WG', taskType: 2, page: 3, take: 12 })
  expect(taskParams(query)).toEqual({ keyword: 'WG', taskType: '2', page: '3' })
  expect(readTaskQuery(new URLSearchParams('taskType=0&page=-1')).page).toBe(1)
})
it('requires matching shipper-domain ID and BE nextAction, not the auth User ID', () => {
  const order = { shipperId: 'domain-id', nextAction: 1, assignedTaskType: 1 }
  expect(canCompleteTask(order, 'domain-id')).toBe(true)
  expect(canCompleteTask(order, 'user-id')).toBe(false)
  expect(canCompleteTask({ ...order, nextAction: null }, 'domain-id')).toBe(false)
})
it('detects assignment, payment, revision and destination changes before a write', () => {
  const row = { id: 'o', revision: 1, returnLockerId: 'l1', assignedTaskType: 1 }
  for (const patch of [{ revision: 2 }, { returnLockerId: 'l2' }, { assignedTaskType: 2 }, { paymentStatus: 2 }]) {
    expect(taskSnapshot(row)).not.toBe(taskSnapshot({ ...row, ...patch }))
  }
})
it('rejects wrong order, wrong task and non-task QR formats locally', () => {
  expect(matchesTaskQr('WASHGO:COLLECT:WG1:123456', 'WG1', 1)).toBe(true)
  expect(matchesTaskQr('WASHGO:RETURN:WG1:123456', 'WG1', 1)).toBe(false)
  expect(matchesTaskQr('WASHGO:COLLECT:WG2:123456', 'WG1', 1)).toBe(false)
  expect(matchesTaskQr('WASHGO:ORDER:WG1', 'WG1', 1)).toBe(false)
})
it('requires a valid credential and explicit confirmation', async () => {
  expect(await credentialSchema.isValid({ mode: 'pin', pinCode: '123456', confirmed: true })).toBe(true)
  expect(await credentialSchema.isValid({ mode: 'pin', pinCode: '123', confirmed: true })).toBe(false)
  expect(await credentialSchema.isValid({ mode: 'pin', pinCode: '123456', confirmed: false })).toBe(false)
})
