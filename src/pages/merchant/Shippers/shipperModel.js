import * as yup from 'yup'

export const SHIPPER_TAKE = 12
// Matches BE ShipperTaskLimits; existing profiles must supply their effective limit.
export const SHIPPER_TASK_LIMIT = { min: 1, max: 20, default: 3 }
export const shipperSchema = yup.object({
  fullName: yup.string().trim().required().max(100),
  phone: yup.string().trim().required().matches(/^0[0-9]{9}$/),
  email: yup.string().trim().lowercase().email().required().max(100),
  vehicleType: yup.number().required().oneOf([1, 2, 3]),
  vehiclePlate: yup.string().trim().uppercase().max(20).when('vehicleType', { is: (value) => value !== 3, then: (schema) => schema.required().matches(/^[0-9A-Z][0-9A-Z.\- ]{3,19}$/) }),
  identityNumber: yup.string().trim().test('identity', '', (value) => !value || /^(?:[0-9]{9}|[0-9]{12})$/.test(value)),
  maxActiveTasks: yup.number().transform((value, original) => original === '' || original == null ? NaN : value).typeError('shipperCapacity.invalidLimit').required('shipperCapacity.invalidLimit').integer('shipperCapacity.invalidLimit').min(SHIPPER_TASK_LIMIT.min, 'shipperCapacity.invalidLimit').max(SHIPPER_TASK_LIMIT.max, 'shipperCapacity.invalidLimit').test('activeTasks', 'shipperCapacity.belowActive', function (value) {
    return value >= (this.options.context?.activeTaskCount ?? 0)
  }),
  isActive: yup.boolean().required()
})
export function readShipperQuery(params) {
  const page = Number(params.get('page'))
  return {
    keyword: (params.get('keyword') || '').trim(),
    status: ['1', '2', '3'].includes(params.get('status')) ? params.get('status') : '',
    isActive: ['true', 'false'].includes(params.get('isActive')) ? params.get('isActive') : '',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1
  }
}
export const shipperFilter = (query) => ({ keyword: query.keyword || undefined, status: query.status ? Number(query.status) : undefined, isActive: query.isActive ? query.isActive === 'true' : undefined, page: query.page, take: SHIPPER_TAKE })
export const shipperSnapshot = (item) => JSON.stringify(['revision', 'fullName', 'phone', 'email', 'vehicleType', 'vehiclePlate', 'isActive', 'status', 'maxActiveTasks', 'accountActive', 'identityNumber', 'identityFrontImageUrl', 'identityBackImageUrl'].map((key) => item[key]))

export const shipperLimitConflict = error => {
  const meta = error.response?.data?.meta
  return error.response?.status === 409 && meta?.code === 'ShipperTaskLimitBelowActiveCount' && Number.isSafeInteger(meta.activeTaskCount) && meta.activeTaskCount >= 0 ? meta : null
}
