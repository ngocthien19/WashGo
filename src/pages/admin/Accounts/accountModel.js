import * as yup from 'yup'
import { dateRangeFilter, validRange } from '~/utils/format/dateRange'
import { getApiError } from '~/utils/http/apiError'
import i18n from '~/i18n'
import { isId } from '~/pages/admin/Merchants/merchantModel'

export const ACCOUNT_ROLES = ['Customer', 'Merchant', 'Shipper', 'Admin']
export const ACCOUNT_PERMISSIONS = ['Accounts.ManageAdmins', 'Accounts.ReadDeleted', 'Accounts.Restore']
export const OBLIGATIONS = ['openOrders', 'pendingPayments', 'openRefunds', 'openIncidents', 'unsettledSettlements', 'activeShippers', 'lockerAssignments', 'activeTasks', 'loyaltyPoints', 'heldLoyaltyPoints']
export const ACTION_CAPABILITIES = { Edit: 'canEdit', ChangeEmail: 'canChangeEmail', Lock: 'canLock', Unlock: 'canUnlock', SoftDelete: 'canDelete', Restore: 'canRestore', Permissions: 'canManagePermissions' }
export const blockedReason = (account, action) => account?.capabilities?.blocked?.find(item => item.action === ({ SoftDelete: 'Delete', Permissions: 'ManagePermissions' }[action] || action))?.code
export const accountStatus = account => account.isDeleted ? 'deleted' : account.isActive ? 'active' : 'locked'
export const accountError = error => error.uncertain ? 'accounts.unknown' : i18n.exists(`accounts.errors.${error.response?.data?.meta?.code}`) ? `accounts.errors.${error.response.data.meta.code}` : getApiError(error)
export const accountQuery = params => {
  const from = params.get('from') || '', to = params.get('to') || ''
  const range = validRange(from, to) ? dateRangeFilter({ from, to }) : {}
  const deleted = ['Include', 'Only'].includes(params.get('deleted')) ? params.get('deleted') : 'Exclude'
  return {
    page: Math.max(1, Math.min(1000000, Number.parseInt(params.get('page'), 10) || 1)), take: 20,
    keyword: (params.get('keyword') || '').trim().slice(0, 200),
    role: ACCOUNT_ROLES.includes(params.get('role')) ? params.get('role') : undefined,
    isActive: ['true', 'false'].includes(params.get('isActive')) ? params.get('isActive') === 'true' : undefined,
    deleted, createdFrom: range.fromDate, createdTo: range.toDate,
    sortBy: ['createdAt', 'lastLoginAt', 'fullName', ...(deleted !== 'Exclude' ? ['deletedAt'] : [])].includes(params.get('sortBy')) ? params.get('sortBy') : 'createdAt',
    sortDirection: params.get('sortDirection') === 'asc' ? 'asc' : 'desc'
  }
}
const required = yup.string().trim().required('accounts.validation.required')
const optionalNumber = () => yup.number().transform((value, original) => original === '' || original === undefined ? undefined : value).typeError('accounts.validation.number')
export const accountSchema = editing => yup.object({
  role: required.oneOf(ACCOUNT_ROLES),
  fullName: required.min(2, 'accounts.validation.name').max(100, 'accounts.validation.name').matches(/^[^<>]*$/, 'accounts.validation.name'),
  email: editing ? yup.string() : required.email('accounts.validation.email').max(100, 'accounts.validation.email'),
  phone: yup.string().trim().test('phone', 'accounts.validation.phone', function(value) {
    if (!value && editing) {
      return ['Admin', 'Merchant'].includes(this.parent.role)
    }
    return editing || ['Customer', 'Admin'].includes(this.parent.role) ? /^0\d{9}$/.test(value || '') : /^\+?[0-9 ()\-.]+$/.test(value || '') && /^\d{9,11}$/.test((value || '').replace(/\D/g, ''))
  }),
  address: yup.string().when('role', { is: role => !editing && role === 'Merchant', then: () => required.max(500, 'accounts.validation.length') }),
  city: yup.string().when('role', { is: role => !editing && role === 'Merchant', then: () => required.max(100, 'accounts.validation.length') }),
  latitude: optionalNumber().when('role', { is: role => !editing && role === 'Merchant', then: schema => schema.required('accounts.validation.required').min(-90, 'accounts.validation.coordinate').max(90, 'accounts.validation.coordinate') }),
  longitude: optionalNumber().when('role', { is: role => !editing && role === 'Merchant', then: schema => schema.required('accounts.validation.required').min(-180, 'accounts.validation.coordinate').max(180, 'accounts.validation.coordinate') }),
  merchantId: yup.string().when('role', { is: role => !editing && role === 'Shipper', then: () => required.test('merchant-id', 'accounts.validation.required', value => isId(value) && value !== '00000000-0000-0000-0000-000000000000') }),
  vehiclePlate: yup.string().trim().uppercase().max(20, 'accounts.validation.length').when(['role', 'vehicleType'], { is: (role, vehicleType) => !editing && role === 'Shipper' && vehicleType !== 3, then: schema => schema.required('accounts.validation.required').matches(/^[0-9A-Z][0-9A-Z.\- ]{3,19}$/, 'accounts.validation.length') }),
  vehicleType: yup.number().oneOf([1, 2, 3]),
  depositAmount: optionalNumber().min(0, 'accounts.validation.number'),
  commissionRate: optionalNumber().min(0, 'accounts.validation.number').max(100, 'accounts.validation.number'),
  serviceRadiusKm: optionalNumber().integer('accounts.validation.number').min(1, 'accounts.validation.number').max(100, 'accounts.validation.number'),
  maxCapacity: optionalNumber().integer('accounts.validation.number').min(1, 'accounts.validation.number')
})
export function accountPayload(values, editing, avatarUrl) {
  const common = { fullName: values.fullName.trim(), phone: values.phone.trim(), avatarUrl }
  if (editing) {
    return common
  }
  const email = values.email.trim()
  if (values.role === 'Merchant') {
    const merchant = { businessName: common.fullName, email, phone: common.phone, address: values.address.trim(), city: values.city.trim(), latitude: values.latitude, longitude: values.longitude }
    for (const key of ['depositAmount', 'commissionRate', 'serviceRadiusKm', 'maxCapacity']) {
      if (values[key] !== undefined) {
        merchant[key] = values[key]
      }
    }
    return { role: values.role, merchant }
  }
  if (values.role === 'Shipper') {
    return { role: values.role, shipper: { fullName: common.fullName, email, phone: common.phone, merchantId: values.merchantId, vehicleType: values.vehicleType, vehiclePlate: values.vehiclePlate.trim() || null } }
  }
  return { ...common, email, role: values.role }
}
export const applyAccountFieldErrors = (error, setError) => {
  let applied = false
  for (const [key, messages] of Object.entries(error.response?.data?.errors || {})) {
    const name = key.replace(/^(merchant|shipper)\./i, '').replace(/^businessName$/i, 'fullName')
    const field = name.charAt(0).toLowerCase() + name.slice(1)
    if (['fullName', 'email', 'phone', 'avatarUrl', 'address', 'city', 'latitude', 'longitude', 'merchantId', 'vehiclePlate', 'vehicleType', 'depositAmount', 'commissionRate', 'serviceRadiusKm', 'maxCapacity', 'newEmail', 'code', 'password', 'reason'].includes(field)) {
      setError(field, { type: 'server', message: Array.isArray(messages) ? messages[0] : messages }); applied = true
    }
  }
  const conflict = { EmailAlreadyInUse: 'email', PhoneAlreadyInUse: 'phone', WrongPassword: 'password' }[error.response?.data?.meta?.code]
  if (conflict) {
    setError(conflict, { type: 'server', message: accountError(error) }); applied = true
  }
  return applied
}
