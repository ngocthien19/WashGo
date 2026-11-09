import * as yup from 'yup'
import { isId } from '~/pages/admin/Merchants/merchantModel'

export { isId }
export { lockerStateClass, boxStateClass, lockerSortOptions, LOCKER_TAKE } from '~/pages/merchant/Lockers/lockerModel'
import { readLockerQuery, lockerFilter } from '~/pages/merchant/Lockers/lockerModel'

export const readAdminLockerQuery = params => ({ ...readLockerQuery(params), city: (params.get('city') || '').trim(), merchantId: isId(params.get('merchantId')) ? params.get('merchantId') : '' })
export const adminLockerFilter = query => ({ ...lockerFilter(query), city: query.city || undefined, merchantId: query.merchantId || undefined })
export const writeAdminLockerQuery = query => Object.fromEntries(Object.entries(query).filter(([key, value]) => value !== '' && !(key === 'page' && value === 1) && !(key === 'sort' && value === 'code')).map(([key, value]) => [key, String(value)]))
export const unknownLockerWrite = error => Boolean(error.uncertain || !error.response || error.response.status >= 500 || error.response.status === 408)
export const lockerSnapshot = locker => JSON.stringify([
  ...['id', 'code', 'name', 'address', 'ward', 'district', 'city', 'latitude', 'longitude', 'lockerType', 'status', 'description', 'serviceAreaId'].map(key => locker[key] ?? null),
  locker.imageUrls || [], [...(locker.merchants || [])].sort((a, b) => a.priority - b.priority).map(m => [m.merchantId, m.priority]),
  [...(locker.boxes || [])].sort((a, b) => a.id.localeCompare(b.id)).map(b => [b.id, b.boxNumber, b.size, b.status])
])
export const lockerSchema = yup.object({
  code: yup.string().trim().max(50), name: yup.string().trim().required().max(100),
  address: yup.string().trim().required().max(500), city: yup.string().trim().required().max(100), ward: yup.string().trim().max(100),
  latitude: yup.number().required().min(-90).max(90), longitude: yup.number().required().min(-180).max(180),
  lockerType: yup.number().required().oneOf([1, 2]), status: yup.number().required().oneOf([1, 2, 3]),
  description: yup.string().trim().max(2000), boxCount: yup.number().integer().min(1).max(200).required(),
  defaultBoxSize: yup.number().required().oneOf([1, 2, 3])
}).test('coordinates', '', value => value.latitude !== 0 || value.longitude !== 0)

export const lockerDefaults = locker => ({
  code: locker?.code || '', name: locker?.name || '', address: locker?.address || '', ward: locker?.ward || '', city: locker?.city || '',
  latitude: locker?.latitude ?? '', longitude: locker?.longitude ?? '', lockerType: locker?.lockerType || 1,
  status: locker?.status || 1, description: locker?.description || '', boxCount: locker?.boxes?.length || 10, defaultBoxSize: 2
})
export const lockerPayload = (values, locker, merchantIds, imageUrls) => {
  const body = Object.fromEntries(['name', 'address', 'ward', 'city', 'description'].map(key => [key, values[key].trim()]))
  Object.assign(body, { latitude: Number(values.latitude), longitude: Number(values.longitude), lockerType: Number(values.lockerType), imageUrls,
    merchantIds, district: locker?.district || '', serviceAreaId: locker?.serviceAreaId || null })
  if (locker) {
    return { ...body, id: locker.id, status: Number(values.status) }
  }
  return { ...body, code: values.code.trim(), boxCount: Number(values.boxCount), defaultBoxSize: Number(values.defaultBoxSize) }
}
