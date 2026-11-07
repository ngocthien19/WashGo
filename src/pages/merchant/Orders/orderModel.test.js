import { expect, it } from 'vitest'
import { assignmentTask, canWeigh, processingSteps, sameOrderState, validWeight } from './orderModel'

it('allows only Merchant processing transitions and requires weighing for weight-based packages', () => {
  expect(processingSteps({ status: 3, includedWeightKg: 5 })).toEqual([])
  expect(processingSteps({ status: 3, includedWeightKg: 5, actualWeightKg: 6 })).toEqual([4])
  expect(processingSteps({ status: 4 })).toEqual([5, 6, 7, 8])
  expect(processingSteps({ status: 6 })).toEqual([7, 8])
  for (const status of [1, 2, 8, 9, 10, 11, 12, 13, 99]) {
    expect(processingSteps({ status })).toEqual([])
  }
})
it('limits weighing to eligible collected/unpaid packages and validates precise kg input', () => {
  const order = { status: 3, paymentStatus: 1, includedWeightKg: 5, baseProcessingHours: 12, items: [{ isWeightBased: true }] }
  expect(canWeigh(order)).toBe(true)
  expect(canWeigh({ ...order, status: 4 })).toBe(false)
  expect(canWeigh({ ...order, baseProcessingHours: null })).toBe(false)
  expect(canWeigh({ ...order, items: [{ isWeightBased: false }] })).toBe(false)
  for (const value of ['0', '-1', '1001', '1.234', '1e2', '']) {
    expect(validWeight(value)).toBe(false)
  }
  for (const value of ['0.01', '6.25', '1000']) {
    expect(validWeight(value)).toBe(true)
  }
})
it('assigns only the proper delivery stages, including cancelled goods still at the merchant', () => {
  expect(assignmentTask({ status: 2 })).toBe(1)
  expect(assignmentTask({ status: 9, paymentStatus: 1 })).toBe(null)
  expect(assignmentTask({ status: 9, paymentStatus: 2 })).toBe(2)
  expect(assignmentTask({ status: 99, cancelledGoodsStatus: 2 })).toBe(2)
  expect(assignmentTask({ status: 99, cancelledGoodsStatus: 4 })).toBe(null)
  expect(sameOrderState({ status: 3, finalAmount: 50000 }, { status: 3, finalAmount: 55000 })).toBe(false)
})
