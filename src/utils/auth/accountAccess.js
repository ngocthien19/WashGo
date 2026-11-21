// Match explicit BE account failures only. A generic 401/403 is not proof of a lock.
export function accountAccessIssue(error) {
  const data = error?.response?.data
  const code = data?.meta?.code
  if (code === 'AccountLocked') {
    return 'locked'
  }
  if (code === 'AccountDeleted') {
    return 'deleted'
  }
  // A revoked/expired session cannot be renewed. TokenExpired alone still
  // follows the normal refresh-token flow in the HTTP client.
  if (['SessionRevoked', 'SessionExpired', 'InvalidToken'].includes(code)) {
    return 'sessionEnded'
  }
  if (code) {
    return null
  }
  // Compatibility with older BE deployments that omit meta.code.
  const message = data?.message || error?.message
  if ([
    'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.',
    'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Merchant.'
  ].includes(message)) {
    return 'locked'
  }
  return null
}

export function accountAccessReason(error) {
  if (!['locked', 'deleted'].includes(accountAccessIssue(error))) {
    return null
  }
  const reason = error?.response?.data?.meta?.accountAccessReason
  return typeof reason === 'string' ? reason.trim().slice(0, 1000) || null : null
}
