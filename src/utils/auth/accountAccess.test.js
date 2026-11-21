import { expect, it } from 'vitest'
import { accountAccessIssue, accountAccessReason } from './accountAccess'

it('recognizes current BE lock messages and explicit account codes only', () => {
  for (const contact of ['Admin', 'Merchant']) {
    expect(accountAccessIssue({ response: { data: { message: `Tài khoản của bạn đã bị khóa. Vui lòng liên hệ ${contact}.` } } })).toBe('locked')
  }
  expect(accountAccessIssue({ response: { data: { meta: { code: 'AccountDeleted' } } } })).toBe('deleted')
  for (const message of ['Email hoặc mật khẩu không đúng.', 'Tài khoản không tồn tại hoặc đã bị khóa.', 'Forbidden']) {
    expect(accountAccessIssue({ response: { status: 403, data: { message } } })).toBeNull()
  }
})

it('reads only the explicit account-facing reason for locked/deleted failures', () => {
  expect(accountAccessReason({ response: { data: { meta: { code: 'AccountDeleted', accountAccessReason: '  Deleted at your request  ' } } } })).toBe('Deleted at your request')
  expect(accountAccessReason({ response: { data: { meta: { code: 'PermissionRequired', accountAccessReason: 'Internal note' } } } })).toBeNull()
  expect(accountAccessReason({ response: { data: { meta: { code: 'AccountLocked', accountAccessReason: {} } } } })).toBeNull()
})

it('uses stable codes ahead of legacy messages and distinguishes renewable token expiry', () => {
  for (const code of ['SessionRevoked', 'SessionExpired', 'InvalidToken']) {
    const error = { response: { data: { meta: { code, accountAccessReason: 'Do not display' } } } }
    expect(accountAccessIssue(error)).toBe('sessionEnded')
    expect(accountAccessReason(error)).toBeNull()
  }
  for (const code of ['TokenExpired', 'InvalidCredentials', 'InvalidRefreshToken', 'Forbidden']) {
    expect(accountAccessIssue({ response: { data: { meta: { code }, message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' } } })).toBeNull()
  }
})
