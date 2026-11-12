import { shipperSchema } from '~/pages/merchant/Shippers/shipperModel'

export const profileSchema = shipperSchema.pick(['fullName', 'phone', 'vehicleType', 'vehiclePlate'])
export const profileSnapshot = (value) => JSON.stringify(['revision', 'id', 'fullName', 'phone', 'avatarUrl', 'vehicleType', 'vehiclePlate', 'merchantId'].map((key) => value[key] ?? null))
export const profilePayload = (values, avatarUrl) => ({ fullName: values.fullName.trim(), phone: values.phone.replace(/\D/g, ''), vehicleType: values.vehicleType, vehiclePlate: values.vehiclePlate?.trim().toUpperCase() || null, avatarUrl })
