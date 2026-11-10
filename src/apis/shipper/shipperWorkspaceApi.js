import authorizedAxios from '~/utils/authorizedAxios'
import { shipperDeliveryApi } from './shipperDeliveryApi'
import { shipperTaskApi } from './shipperTaskApi'

const invalid = () => new Error('shipper.invalidResponse')
const profile = ({ data }) => {
  const value = data?.data
  if (data?.succeeded !== true || !value?.id || typeof value.fullName !== 'string' || typeof value.email !== 'string'
    || ![1, 2, 3].includes(value.vehicleType) || ![1, 2, 3].includes(value.status) || typeof value.isActive !== 'boolean'
    || !Number.isInteger(value.totalDeliveries) || value.totalDeliveries < 0 || !Number.isFinite(value.rating)) {
    throw invalid()
  }
  return value
}
export const shipperWorkspaceApi = {
  profile: (signal) => authorizedAxios.get('/shipper-profile', { signal }).then(profile).catch((error) => {
    if (error.response?.status === 404) {
      throw new Error('shipper.profileMissing')
    }
    throw error
  }),
  updateProfile: (value) => {
    const body = Object.fromEntries(['fullName', 'phone', 'avatarUrl', 'vehicleType', 'vehiclePlate'].filter((key) => value[key] !== undefined).map((key) => [key, value[key]]))
    return authorizedAxios.put('/shipper-profile', body).then(profile)
  },
  pending: async (taskType, signal) => {
    const result = await shipperTaskApi.list({ taskType, page: 1, take: 5 }, signal)
    return { ...result, list: result.list.map((row) => ({ ...row, taskType: row.assignedTaskType, assignedAt: row.shipperAssignedAt, note: row.shipperNote })) }
  },
  history: (filter, signal) => shipperDeliveryApi.list({ fromDate: filter.fromDate, toDate: filter.toDate, page: 1, take: 5 }, signal)
}
