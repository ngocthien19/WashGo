import { ORDER_PAYMENT_METHODS } from '~/utils/config/constants'

// WashGo's conservative VNPay threshold avoids small-value NCB sandbox failures.
// It is application policy, not VNPay's published gateway-wide minimum (5,000 VND).
// MoMo payWithMethod: wallet 1,000–50,000,000 VND; cards require 10,000 VND.
export const PAYMENT_AMOUNT_LIMITS = {
  [ORDER_PAYMENT_METHODS.VNPAY]: { min: 10000 },
  [ORDER_PAYMENT_METHODS.MOMO]: { min: 1000, max: 50000000 }
}

export function paymentEligibility(method, amount) {
  const limits = PAYMENT_AMOUNT_LIMITS[method]
  // No amount means no quote yet; do not infer fees from cumulative order totals.
  if (amount == null || !limits) {
    return { allowed: true }
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { allowed: false, reason: 'paymentLimits.invalid' }
  }
  if (amount < limits.min) {
    return { allowed: false, reason: method === ORDER_PAYMENT_METHODS.VNPAY ? 'paymentLimits.vnpayMinimum' : 'paymentLimits.momoMinimum' }
  }
  if (limits.max && amount > limits.max) {
    return { allowed: false, reason: 'paymentLimits.momoMaximum' }
  }
  return { allowed: true }
}

export function paymentAmountHint(amount) {
  if (amount == null) {
    return null
  }
  if (!paymentEligibility(2, amount).allowed && !paymentEligibility(3, amount).allowed) {
    return 'paymentLimits.unavailable'
  }
  if (amount < PAYMENT_AMOUNT_LIMITS[2].min) {
    return 'paymentLimits.recommendWallet'
  }
  if (amount > PAYMENT_AMOUNT_LIMITS[3].max) {
    return 'paymentLimits.recommendBank'
  }
  return 'paymentLimits.bankLimits'
}
