import { expect, it } from 'vitest'
import { paymentFailure, validatePaymentSession } from './paymentSession'

const failure = (code, retryAfterSeconds) => ({ response: { status: 409, data: { meta: { code, retryAfterSeconds } } } })
it('permits only explicit same-session retries while initializing; uncertain sessions stay locked', () => {
  expect(paymentFailure(failure('PaymentInitializing', 2))).toMatchObject({ initializing: true, locked: true, retryAfter: 2 })
  expect(paymentFailure(failure('PaymentInitializing', 1000)).retryAfter).toBe(60)
  for (const code of ['PaymentVerificationRequired', 'LegacyPaymentsRequireReview', 'PaymentMethodConflict', 'PaymentPointsConflict', 'PaymentAmountChanged', 'PaymentStateChanged']) {
    expect(paymentFailure(failure(code))).toEqual({ locked: true, message: `paymentSession.${code}` })
  }
  expect(paymentFailure(failure('InsufficientPoints'))).toMatchObject({ locked: false, reloadQuote: true })
  expect(paymentFailure({ response: { status: 400 } }).locked).toBe(false)
  expect(paymentFailure({}).locked).toBe(true)
  expect(paymentFailure({ response: { status: 500 } }).locked).toBe(true)
  expect(paymentFailure({ response: { status: 500, data: { meta: { code: 'InsufficientPoints' } } } }).locked).toBe(true)
})

it('never treats reconciliation or unknown responses as paid or a usable redirect', () => {
  for (const value of [{ requiresReconciliation: true, transactionStatus: 2 }, { transactionStatus: 5 }, { sessionState: 3, paymentUrl: 'https://gateway.test' }]) {
    expect(() => validatePaymentSession(value)).toThrow('paymentSession.PaymentVerificationRequired')
  }
  for (const value of [{ transactionStatus: 3 }, { sessionState: 1 }, { sessionState: 4, transactionStatus: 4 }]) {
    expect(() => validatePaymentSession(value)).toThrow('customer.payment.invalidResponse')
  }
  expect(validatePaymentSession({ sessionState: 2, transactionStatus: 1 })).toBe('ready')
  expect(validatePaymentSession({ sessionState: 4, transactionStatus: 2 })).toBe('completed')
})
