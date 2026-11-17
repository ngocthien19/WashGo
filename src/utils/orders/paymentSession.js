const verificationCodes = new Set(['PaymentVerificationRequired', 'LegacyPaymentsRequireReview', 'PaymentMethodConflict', 'PaymentPointsConflict', 'PaymentAmountChanged', 'PaymentStateChanged'])

export function paymentFailure(failure) {
  const meta = failure.response?.data?.meta
  const code = failure.response?.status === 409 ? meta?.code : null
  if (code === 'PaymentInitializing') {
    const retry = Number(meta.retryAfterSeconds)
    return { initializing: true, locked: true, message: 'paymentSession.initializing', retryAfter: Number.isFinite(retry) ? Math.min(60, Math.max(2, retry)) : 2 }
  }
  if (verificationCodes.has(code)) {
    return { locked: true, message: `paymentSession.${code}` }
  }
  if (code === 'InsufficientPoints') {
    return { locked: false, reloadQuote: true, message: 'paymentSession.InsufficientPoints' }
  }
  if (!failure.response || failure.response.status >= 500) {
    return { locked: true, message: 'customer.payment.uncertain' }
  }
  return { locked: false }
}

// A valid redirect URL is not proof that a transaction can still be used.
export function validatePaymentSession(result) {
  if (result?.requiresReconciliation === true || result?.transactionStatus === 5 || result?.sessionState === 3) {
    const error = new Error('paymentSession.PaymentVerificationRequired')
    error.response = { status: 409, data: { meta: { code: 'PaymentVerificationRequired' } } }
    throw error
  }
  if (result?.transactionStatus === 2) {
    return 'completed'
  }
  if (result?.sessionState != null && result.sessionState !== 2 || result?.transactionStatus != null && result.transactionStatus !== 1) {
    throw new Error('customer.payment.invalidResponse')
  }
  return 'ready'
}
