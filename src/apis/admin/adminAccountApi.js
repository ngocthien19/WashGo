import authorizedAxios from '~/utils/http/authorizedAxios'
import i18n from '~/i18n'

const root = '/admin/accounts'
const pending = new Map()
const listeners = new Set()
let snapshot = []
const publish = () => {
  snapshot = [...pending.values()]; listeners.forEach(listener => listener())
}
const invalid = () => new Error('admin.invalidResponse')
const id = value => typeof value === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
const revision = value => Number.isSafeInteger(value) && value >= 0
const row = value => id(value?.id) && revision(value.revision) && ['Customer', 'Merchant', 'Shipper', 'Admin'].includes(value.role)
  && ['fullName', 'email', 'signInMethod'].every(key => typeof value[key] === 'string')
  && ['isActive', 'isDeleted', 'isProtected'].every(key => typeof value[key] === 'boolean')
  && value.capabilities && ['canEdit', 'canChangeEmail', 'canLock', 'canUnlock', 'canDelete', 'canRestore', 'canManagePermissions', 'requiresReauthentication'].every(key => typeof value.capabilities[key] === 'boolean')
  && Array.isArray(value.capabilities.blocked)
const unwrap = (response, validate) => {
  if (response.data?.succeeded !== true || !validate(response.data.data)) {
    throw invalid()
  }
  return response.data.data
}
const count = value => Number.isSafeInteger(value) && value >= 0
const batch = (value, intent) => value?.operationId === intent.operationId && value.state === 'Completed'
  && Array.isArray(value.items) && value.items.length === intent.ids.length
  && new Set(value.items.map(item => item.id)).size === intent.ids.length
  && value.items.every(item => intent.ids.includes(item.id) && typeof item.succeeded === 'boolean'
    && ['Changed', 'Unchanged', 'Skipped', 'Failed'].includes(item.outcome))
  && value.totals && ['changed', 'unchanged', 'skipped', 'failed', 'succeeded'].every(key => count(value.totals[key]))
const result = (envelope, intent) => {
  if (envelope?.succeeded !== true) {
    throw invalid()
  }
  const value = envelope.data
  if (intent.action === 'Batch' ? !batch(value, intent) : !row(value) || intent.resourceId !== 'new' && value.id !== intent.resourceId) {
    throw invalid()
  }
  if (intent.action === 'Create' && value.role !== intent.body.role) {
    throw invalid()
  }
  return intent.action === 'Batch' ? { ...value, items: value.items.map(item => ({ ...item, ...intent.labels?.[item.id] })) } : value
}
const uncertain = error => !error.response || error.response.status >= 500 || error.response.status === 408
const translateError = error => {
  const code = error.response?.data?.meta?.code
  if (code && i18n.exists(`accounts.errors.${code}`)) {
    error.message = `accounts.errors.${code}`
  }
  return error
}
export const accountOperations = {
  subscribe: listener => {
    listeners.add(listener); return () => listeners.delete(listener)
  },
  snapshot: () => snapshot,
  blocked: ids => snapshot.some(intent => intent.ids.some(key => ids.includes(key))),
  // Memory only: an unknown outcome keeps the original request locked across page navigation.
  async send({ action, resourceId, method = 'post', suffix = '', body, ids = [resourceId], labels }) {
    if (this.blocked(ids)) {
      throw new Error('accounts.unknown')
    }
    const operationId = crypto.randomUUID()
    const intent = { operationId, action, resourceId, ids, labels, method, path: `${root}${suffix}`, body: { ...body, operationId } }
    pending.set(operationId, intent); publish()
    try {
      const response = await authorizedAxios[method](intent.path, intent.body)
      if (response.data?.succeeded === true && response.data.meta?.state === 'Processing') {
        throw new Error('accounts.processing')
      }
      const value = result(response.data, intent)
      pending.delete(operationId); publish()
      return value
    } catch (error) {
      if (!uncertain(error) && error.message !== 'admin.invalidResponse') {
        pending.delete(operationId); publish()
      } else {
        error.uncertain = true
      }
      throw translateError(error)
    }
  },
  async check(intent) {
    // The Account module now bridges both partner creates. Validate the role-
    // specific resource key before accepting a recovered account result.
    const operationResource = intent.action === 'Create' && ['Merchant', 'Shipper'].includes(intent.body.role)
      ? `new:${intent.body.role}` : intent.resourceId
    const operation = unwrap(await authorizedAxios.get(`${root}/operations/${intent.operationId}`), value => value?.operationId === intent.operationId
      && value.action === intent.action && value.resourceId === operationResource && ['Completed', 'Processing'].includes(value.state))
    if (operation.state !== 'Completed') {
      throw new Error('accounts.processing')
    }
    if (operation.result?.succeeded === false && typeof operation.result.statusCode === 'number') {
      pending.delete(intent.operationId); publish()
      throw translateError(Object.assign(new Error('common.somethingWentWrongPleaseTryAgain'), { response: { status: operation.result.statusCode, data: operation.result } }))
    }
    const value = result(operation.result, intent)
    pending.delete(intent.operationId); publish()
    return value
  }
}
export const adminAccountApi = {
  list: async (params, signal) => unwrap(await authorizedAxios.get(root, { params, signal }), value => Array.isArray(value?.items) && value.items.every(row)
    && count(value.total) && count(value.page) && value.page > 0 && count(value.take) && value.take > 0 && typeof value.hasMore === 'boolean'),
  summary: async signal => unwrap(await authorizedAxios.get(`${root}/summary`, { signal }), value => ['total', 'active', 'locked'].every(key => count(value?.[key])) && (value.deleted === null || count(value.deleted))),
  detail: async (accountId, signal) => unwrap(await authorizedAxios.get(`${root}/${accountId}`, { signal }), value => row(value) && value.id === accountId && value.obligations && Array.isArray(value.obligations.deleteBlockers)),
  activities: async (accountId, page, signal) => {
    const response = await authorizedAxios.get(`${root}/${accountId}/activities`, { params: { page, take: 10 }, signal })
    const value = response.data
    if (value?.succeeded !== true || !Array.isArray(value.list) || !count(value.total) || !count(value.currentPage)) {
      throw invalid()
    }
    return value
  },
  preview: async (action, ids, signal) => unwrap(await authorizedAxios.post(`${root}/bulk/preview`, { action, ids }, { signal }), value => value?.action === action
    && Array.isArray(value.items) && value.items.length === ids.length && new Set(value.items.map(item => item.id)).size === ids.length
    && value.items.every(item => ids.includes(item.id) && typeof item.canApply === 'boolean' && Array.isArray(item.reasonCodes)
      && (!item.found || revision(item.revision)))),
  reauthenticate: async password => unwrap(await authorizedAxios.post('/auth/reauthenticate', { password }), value => typeof value?.reauthenticatedUntil === 'string'),
  emailChallenge: async (accountId, body) => unwrap(await authorizedAxios.post(`${root}/${accountId}/email-change`, body), value => typeof value?.newEmail === 'string' && typeof value.expiresAt === 'string')
}
