export const receiptReference = (orderCode, payment) => {
  if (typeof payment.providerTransactionId === 'string' && payment.providerTransactionId.trim()) {
    return payment.providerTransactionId
  }
  const reference = payment.reference
  if (typeof reference !== 'string') {
    return ''
  }
  const separator = reference.lastIndexOf('-'), suffix = reference.slice(separator + 1), prefix = reference.slice(0, separator)
  const known = ['PAY', 'TOTAL', 'FEE', 'CANCEL'].some(kind => prefix === `WG-${kind}-${orderCode}`)
  const validSuffix = /^[a-f0-9]{32}$/i.test(suffix) || payment.method === 3 && /^[a-f0-9]{16}$/i.test(suffix)
  return separator >= 0 && known && validSuffix ? prefix : reference
}
