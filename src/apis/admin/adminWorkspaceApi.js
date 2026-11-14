import { accountSecurityApi } from '~/apis/auth/accountSecurityApi'
import authorizedAxios from '~/utils/authorizedAxios'
import { resolveAuditCodes } from './auditResourceCodes'

const invalid = () => new Error('admin.invalidResponse')
const count = n => Number.isSafeInteger(n) && n >= 0
const instant = s => typeof s === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(s) && Number.isFinite(Date.parse(s))
const unwrap = ({ data }) => {
  if (data?.succeeded !== true || data.data == null) {
    throw invalid()
  }
  return data.data
}
const paged = ({ data }) => {
  if (data?.succeeded !== true || !Array.isArray(data.list) || !count(data.total)) {
    throw invalid()
  }
  return data
}
// PostgreSQL microsecond ticks exceed Number.MAX_SAFE_INTEGER. Keep versions as decimal strings in memory.
export const parseAdminProfile = raw => typeof raw === 'string' ? JSON.parse(raw.replace(/("version"\s*:\s*)(\d+)/g, '$1"$2"')) : raw
const profile = value => {
  if (!value?.id || value.role !== 'Admin' || typeof value.fullName !== 'string' || typeof value.email !== 'string' || typeof value.version !== 'string' || !value.version.trim() || !instant(value.joinedAt) || !['Active', 'Locked'].includes(value.accountStatus) || !Array.isArray(value.editableFields)) {
    throw invalid()
  }
  return { ...value, version: String(value.version) }
}
const profileOptions = { transformResponse: [parseAdminProfile] }
const kpi = v => v && Number.isFinite(v.current) && (v.previous === null || Number.isFinite(v.previous)) && (v.changePercent === null || Number.isFinite(v.changePercent)) && typeof v.isNew === 'boolean'
export const adminWorkspaceApi = {
  profile: signal => authorizedAxios.get('/admin/profile', { ...profileOptions, signal }).then(unwrap).then(profile),
  saveProfile: async ({ fullName, phone, avatar, expectedVersion }, id) => {
    if (typeof expectedVersion !== 'string' || !expectedVersion.trim()) {
      throw invalid()
    }
    const body = { fullName, phone, avatar, expectedVersion }
    const value = profile(unwrap(await authorizedAxios.put('/admin/profile', body, { ...profileOptions, headers: { 'Content-Type': 'application/json' } })))
    if (value.id !== id) {
      throw invalid()
    }
    return value
  },
  dashboard: (filter, signal) => authorizedAxios.get('/admin/dashboard', { params: { period: 'custom', fromDate: filter.fromDate, toDate: filter.toDate, topMerchants: 5 }, signal }).then(unwrap).then(v => {
    if (!instant(v.generatedAt) || !instant(v.fromDate) || !instant(v.toDate) || !['total', 'locked'].every(k => count(v.customers?.[k])) || !['active', 'inactive', 'suspended'].every(k => count(v.merchants?.[k])) || !kpi(v.customers.new) || !kpi(v.merchants.new) || !['created', 'completed', 'cancelled'].every(k => kpi(v.orders?.[k])) || !count(v.orders.waitingAssignment) || !v.orders.currentByStatus || !Object.values(v.orders.currentByStatus).every(count) || !kpi(v.revenue?.total) || !['laundryRevenue', 'storageFeeRevenue', 'cancellationFeeRevenue', 'refundedAmount'].every(k => Number.isFinite(v.revenue[k])) || !['total', 'active', 'maintenance', 'inactive', 'availableBoxes', 'totalBoxes', 'nearlyFull'].every(k => count(v.lockers?.[k])) || !Array.isArray(v.topMerchants) || v.topMerchants.some(r => !r.merchantId || typeof r.businessName !== 'string' || !['completedOrders', 'cancelledOrders', 'finishedOrders', 'ratingCount'].every(k => count(r[k])) || !(r.completionRate === null || Number.isFinite(r.completionRate)) || !(r.rating === null || Number.isFinite(r.rating)))) {
      throw invalid()
    }
    return v
  }),
  alerts: (query, signal) => authorizedAxios.get('/admin/alerts', { params: query, signal }).then(unwrap).then(v => {
    if (!instant(v.generatedAt) || !count(v.total) || !count(v.totalAll) || v.page !== query.page || v.take !== query.take || !Array.isArray(v.summary) || v.summary.some(r => !count(r.count)) || !Array.isArray(v.items) || v.items.some(r => !Number.isInteger(r.type) || ![1, 2, 3].includes(r.severity) || r.source !== 'Rule' || !r.resourceId || !['Order', 'Locker', 'Merchant', 'Incident'].includes(r.resourceType) || !instant(r.deadline) || !count(r.overdueMinutes))) {
      throw invalid()
    }
    return v
  }),
  activities: (query, personal, signal) => (personal ? authorizedAxios.get('/admin/me/activities', { params: { page: query.page, take: query.take, module: query.module }, signal }) : authorizedAxios.post('/admin/audit-logs/filter', Object.fromEntries(['page', 'take', 'keyword', 'fromDate', 'toDate', 'actorId', 'actorRole', 'module', 'action', 'resourceType', 'resourceId', 'result'].filter(k => query[k] !== '' && query[k] != null).map(k => [k, query[k]])), { signal })).then(paged).then(v => {
    if (v.list.some(r => !r.id || !instant(r.occurredAt) || ![1, 2, 3].includes(r.result) || !Array.isArray(r.changedFields))) {
      throw invalid()
    }
    return resolveAuditCodes(v.list, signal).then(list => ({ ...v, list }))
  }),
  activity: (id, signal) => authorizedAxios.get(`/admin/audit-logs/${encodeURIComponent(id)}`, { signal }).then(unwrap).then(v => {
    if (v.id !== id || !instant(v.occurredAt) || !Array.isArray(v.changedFields)) {
      throw invalid()
    } return resolveAuditCodes([v], signal).then(([row]) => row)
  }),
  ...accountSecurityApi
}
