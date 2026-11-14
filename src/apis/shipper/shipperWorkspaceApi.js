import authorizedAxios from '~/utils/http/authorizedAxios'
import { shipperDeliveryApi } from './shipperDeliveryApi'
import { shipperTaskApi, taskView } from './shipperTaskApi'

const pendingProfiles = new Map()
const invalid = () => new Error('shipper.invalidResponse')
const profile = ({ data }) => {
  const value = data?.data
  if (data?.succeeded !== true || !value?.id || typeof value.fullName !== 'string' || typeof value.email !== 'string' || typeof value.revision !== 'string' || !value.revision.trim()
    || ![1, 2, 3].includes(value.vehicleType) || ![1, 2, 3].includes(value.status) || typeof value.isActive !== 'boolean'
    || !Number.isInteger(value.totalDeliveries) || value.totalDeliveries < 0) {
    throw invalid()
  }
  return value
}
export const shipperWorkspaceApi = {
  activities: async (query, signal) => {
    const { data } = await authorizedAxios.get('/shipper-profile/activities', { params: query, signal }); if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total)) {
      throw invalid()
    } return data
  },
  profile: (signal) => authorizedAxios.get('/shipper-profile', { signal }).then(profile).catch((error) => {
    if (error.response?.status === 404) {
      throw new Error('shipper.profileMissing')
    }
    throw error
  }),
  profileOperation: operationId => authorizedAxios.get(`/shipper-profile/operations/${encodeURIComponent(operationId)}`).then(profile),
  dashboard: async (query, signal) => {
    const { data } = await authorizedAxios.get('/shipper-dashboard', { params: query, signal })
    const value = data?.data
    if (data?.succeeded !== true || !value || !['pendingCollectCount', 'pendingReturnCount', 'completedCollectCount', 'completedReturnCount', 'totalDeliveries'].every(key => Number.isInteger(value[key]) && value[key] >= 0) || !Array.isArray(value.chart) || !Array.isArray(value.recentCompletions) || !Array.isArray(value.pendingCollect) || !Array.isArray(value.pendingReturn)) {
      throw invalid()
    }
    if (['pendingStorageTransferCount', 'pendingStorageReturnCount', 'completedStorageTransferCount', 'completedStorageReturnCount'].some(key => value[key] !== undefined && (!Number.isInteger(value[key]) || value[key] < 0)) || value.pendingStorage !== undefined && !Array.isArray(value.pendingStorage)) {
      throw invalid()
    }
    return { ...value, pendingCollect: value.pendingCollect.map(taskView), pendingReturn: value.pendingReturn.map(taskView), pendingStorage: (value.pendingStorage || []).map(taskView) }
  },
  hasPendingProfile: id => pendingProfiles.has(id),
  checkProfile: async id => {
    const operationId = pendingProfiles.get(id)
    if (!operationId) {
      throw new Error('shipper.unknown')
    }
    const result = await shipperWorkspaceApi.profileOperation(operationId)
    if (result.id !== id) {
      throw invalid()
    }
    pendingProfiles.delete(id)
    return result
  },
  updateWorkStatus: async value => shipperWorkspaceApi.updateProfile(value, true),
  updateProfile: async (value, workStatus = false) => {
    if (!value.expectedRevision || !value.operationId) {
      throw invalid()
    }
    if (pendingProfiles.has(value.id)) {
      throw Object.assign(new Error('shipper.unknown'), { uncertain: true })
    }
    if (workStatus && ![1, 3].includes(value.status)) {
      throw invalid()
    }
    const body = Object.fromEntries((workStatus ? ['status', 'expectedRevision', 'operationId'] : ['fullName', 'phone', 'avatarUrl', 'vehicleType', 'vehiclePlate', 'expectedRevision', 'operationId']).filter(key => value[key] !== undefined).map(key => [key, value[key]]))
    pendingProfiles.set(value.id, value.operationId)
    try {
      const result = profile(await authorizedAxios.put(workStatus ? '/shipper-profile/work-status' : '/shipper-profile', body))
      if (result.id !== value.id) {
        throw Object.assign(invalid(), { uncertain: true })
      }
      pendingProfiles.delete(value.id)
      return result
    } catch (error) {
      if (error.uncertain || !error.response || error.response.status >= 500 || error.response.status === 408) {
        error.uncertain = true
      } else {
        pendingProfiles.delete(value.id)
      }
      throw error
    }
  },
  pending: async (taskType, signal) => {
    const result = await shipperTaskApi.list({ taskType, page: 1, take: 5 }, signal)
    return { ...result, list: result.list.map((row) => ({ ...row, taskType: row.assignedTaskType, assignedAt: row.shipperAssignedAt, note: row.shipperNote })) }
  },
  history: (filter, signal) => shipperDeliveryApi.list({ fromDate: filter.fromDate, toDate: filter.toDate, page: 1, take: 5 }, signal)
}
