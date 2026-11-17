import { expect, it } from 'vitest'
import { paymentAmountHint, paymentEligibility } from './paymentEligibility'

it('enforces the WashGo VNPay safeguard and wallet boundaries without rounding charges', () => {
  for (const amount of [1000, 4999, 5000, 9000, 9999.99]) {
    expect(paymentEligibility(2, amount).allowed).toBe(false)
    expect(paymentEligibility(3, amount).allowed).toBe(true)
    expect(paymentAmountHint(amount)).toBe('paymentLimits.recommendWallet')
  }
  expect(paymentEligibility(2, 10000).allowed).toBe(true)
  expect(paymentEligibility(3, 50000000).allowed).toBe(true)
  expect(paymentEligibility(3, 50000001).allowed).toBe(false)
  expect(paymentEligibility(2, 50000001).allowed).toBe(true)
  expect(paymentAmountHint(50000001)).toBe('paymentLimits.recommendBank')
  for (const amount of [0, -1, NaN, Infinity, 999]) {
    expect(paymentEligibility(2, amount).allowed).toBe(false)
    expect(paymentEligibility(3, amount).allowed).toBe(false)
    expect(paymentAmountHint(amount)).toBe('paymentLimits.unavailable')
  }
})

it('does not infer an unknown fee or constrain the create-order cash choice', () => {
  expect(paymentEligibility(2, undefined).allowed).toBe(true)
  expect(paymentAmountHint(undefined)).toBeNull()
  expect(paymentEligibility(1, 9000).allowed).toBe(true)
})
