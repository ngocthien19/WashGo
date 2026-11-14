import authorizedAxios from '~/utils/http/authorizedAxios'
const invalid = () => new Error('admin.invalidResponse')
const count = n => Number.isSafeInteger(n) && n >= 0
const instant = s => typeof s === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(s) && Number.isFinite(Date.parse(s))
const unwrap = ({ data }) => {
  if (data?.succeeded !== true || data.data == null) {
    throw invalid()
  } return data.data
}
export const accountSecurityApi = {
  security: signal => authorizedAxios.get('/auth/security', { signal }).then(unwrap).then(v => {
    if (!['hasPassword', 'googleLinked', 'twoFactorSupported', 'twoFactorEnabled'].every(k => typeof v[k] === 'boolean') || !count(v.activeSessions)) {
      throw invalid()
    } return v
  }),
  sessions: (signal, query = { page: 1, take: 10 }) => authorizedAxios.get('/auth/sessions', { params: query, signal }).then(unwrap).then(v => {
    const validSession = row => row && typeof row.id === 'string' && typeof row.isCurrent === 'boolean' && ['startedAt', 'lastActiveAt', 'expiresAt'].every(key => instant(row[key]))
    if (!count(v.total) || v.page !== query.page || v.take !== query.take || typeof v.hasMore !== 'boolean' || !Array.isArray(v.items) || !v.items.every(validSession) || !(v.current === null || validSession(v.current) && v.current.isCurrent)) {
      throw invalid()
    }
    return v
  }),
  password: async ({ currentPassword, newPassword, confirmNewPassword, revokeOtherSessions }) => {
    if (unwrap(await authorizedAxios.post('/auth/change-password', { currentPassword, newPassword, confirmNewPassword, revokeOtherSessions })) !== true) {
      throw invalid()
    }
  },
  revoke: async id => {
    const v = unwrap(await (id ? authorizedAxios.delete(`/auth/sessions/${encodeURIComponent(id)}`) : authorizedAxios.post('/auth/sessions/revoke-others'))); if (!count(v.revoked)) {
      throw invalid()
    } return v
  }
}
