import { expect, it } from 'vitest'
import { assignmentTask, canWeigh, processingSteps, sameOrderState, validWeight } from './orderModel'
it('uses server metadata rather than inferring permissions from a status or kg package', () => {
  expect(processingSteps({ status: 4 })).toEqual([])
  expect(canWeigh({ status: 3, includedWeightKg: 5 })).toBe(false)
  expect(assignmentTask({ status: 2 })).toBe(null)
  const order = { status: 4, allowedActions: { allowedNextStatuses: [6, 8, 12, 99], canUpdateWeight: false, canAssignShipper: false } }
  expect(processingSteps(order)).toEqual([6, 8])
  expect(canWeigh(order)).toBe(false)
  expect(assignmentTask(order)).toBe(null)
  expect(canWeigh({ allowedActions: { canUpdateWeight: true } })).toBe(true)
  expect(assignmentTask({ allowedActions: { canAssignShipper: true, assignTaskType: 2 } })).toBe(2)
  expect(assignmentTask({ allowedActions: { canAssignShipper: false, assignTaskType: 1 } })).toBe(null)
})
it('rejects changed revisions even when displayed fields still match', () => {
  expect(sameOrderState({ revision: 10, status: 3 }, { revision: 11, status: 3 })).toBe(false)
  expect(sameOrderState({ status: 3 }, { status: 3 })).toBe(false)
  expect(sameOrderState({ revision: 10, status: 3 }, { revision: 10, status: 3 })).toBe(true)
  expect(sameOrderState({ revision: 10, finalAmount: 100 }, { revision: 10, finalAmount: 200 })).toBe(false)
})
it('accepts only precise positive kg input in the supported range', () => {
  for (const value of ['0', '-1', '1001', '1.234', '1e2', '']) {
    expect(validWeight(value)).toBe(false)
  }
  for (const value of ['0.01', '6.25', '1000']) {
    expect(validWeight(value)).toBe(true)
  }
})
