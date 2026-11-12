import authorizedAxios from '~/utils/authorizedAxios'
import { orderManagementApi } from '~/apis/orderManagementApi'

const invalid = () => new Error('shipper.invalidResponse')
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]))
const pending = new Map()
// Adapt the dedicated task DTO to the existing presentation; never keep credentials/customer fields.
export const taskView = row => {
  if (!row?.taskId || !row.orderId || ![1, 2].includes(row.taskType) || ![1, 2, 3, 4].includes(row.status) || typeof row.canCollect !== 'boolean' || typeof row.canReturn !== 'boolean') {
    throw invalid()
  }
  const detail = pick(row.order || {}, ['paymentStatus', 'shipperId', 'lockerId', 'boxId', 'returnLockerId', 'returnBoxId', 'cancelledGoodsStatus', 'actualWeightKg', 'merchantImageUrls', 'merchantEmail', 'merchantPhoneNumber'])
  return { ...pick(row, ['taskId', 'orderId', 'orderCode', 'merchantOrderCode', 'assignmentVersion', 'deadline', 'slaStartedAt', 'slaHours', 'slaUnavailableReason', 'serverNow', 'isOverdue', 'canCollect', 'canReturn', 'reasonCode', 'merchantName', 'assignedAt', 'completedAt', 'endedAt', 'taskLockerName', 'taskLockerAddress', 'taskLockerLatitude', 'taskLockerLongitude', 'taskLockerImageUrls', 'taskBoxNumber']), ...detail,
    id: row.orderId, revision: row.orderRevision, taskStatus: row.status, status: row.orderStatus,
    assignedTaskType: row.taskType, shipperAssignedAt: row.assignedAt, shipperNote: row.note, note: row.note,
    nextAction: row.canCollect ? 1 : row.canReturn ? 2 : null, merchantPhone: detail.merchantPhoneNumber,
    items: (row.order?.items || []).map(item => pick(item, ['id', 'serviceName', 'quantity', 'note', 'serviceImageUrls'])) }
}
const unwrap = response => {
  if (response.data?.succeeded !== true || !response.data.data) {
    throw invalid()
  }
  return response.data.data
}
const resultView = (result, order, type) => {
  const validState = type === 1 ? result?.status === 3 : result?.status === 10 || result?.status === 99 && result?.cancelledGoodsStatus === 3
  if (result?.id !== order.id || result.assignedTaskType !== type || order.shipperId && result.shipperId !== order.shipperId || !validState || type === 2 && !result.returnBoxNumber) {
    throw Object.assign(invalid(), { uncertain: true })
  }
  return { status: result.status, boxNumber: type === 1 ? order.taskBoxNumber : result.returnBoxNumber }
}
const filter = value => ({ ...pick(value, ['keyword', 'taskType', 'assignedFrom', 'assignedTo', 'sortBy']), taskStatus: value.taskStatus ?? 1, page: value.page || 1, take: value.take || 12 })
export const shipperTaskApi = {
  list: async (query = {}, signal) => {
    const body = filter(query)
    body.sortBy ||= [{ field: 'AssignedAt', isDescending: false }]
    const { data } = await authorizedAxios.post('/shipper-tasks/filter', body, { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isSafeInteger(data.total) || data.total < 0) {
      throw invalid()
    }
    return { list: data.list.map(taskView), total: data.total, currentPage: body.page, totalPages: Math.ceil(data.total / body.take) }
  },
  summary: async (query, signal) => {
    const value = unwrap(await authorizedAxios.post('/shipper-tasks/summary', pick(query, ['keyword', 'assignedFrom', 'assignedTo']), { signal }))
    if (!['totalPending', 'collectPending', 'returnPending'].every(key => Number.isInteger(value[key]) && value[key] >= 0) || value.totalPending !== value.collectPending + value.returnPending) {
      throw invalid()
    }
    return value
  },
  detail: async (id, signal) => taskView(unwrap(await authorizedAxios.get(`/shipper-tasks/${encodeURIComponent(id)}`, { signal }))),
  // Notification links issued before task IDs were introduced contain orderId. Resolve only on explicit navigation.
  resolve: async (id, signal) => {
    try {
      return await shipperTaskApi.detail(id, signal)
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error
      }
      const order = await orderManagementApi.detail(id, signal)
      const page = await shipperTaskApi.list({ keyword: order.orderCode, take: 100 }, signal)
      const row = page.list.find(item => item.orderId === id && item.nextAction)
      if (!row) {
        throw new Error('shipper.tasks.noAction')
      }
      return shipperTaskApi.detail(row.taskId, signal)
    }
  },
  credentials: async order => {
    const value = unwrap(await authorizedAxios.get(`/shipper-tasks/${encodeURIComponent(order.taskId)}/credentials`, { headers: { 'Cache-Control': 'no-cache' } }))
    if (value.taskId !== order.taskId || value.assignmentVersion !== order.assignmentVersion || value.orderRevision !== order.revision) {
      throw new Error('shipper.tasks.changed')
    }
    return value
  },
  hasPending: order => pending.has(order.taskId),
  check: async order => {
    const entry = pending.get(order.taskId)
    if (!entry) {
      throw new Error('shipper.tasks.unknown')
    }
    const value = unwrap(await authorizedAxios.get(`/shipper-tasks/${encodeURIComponent(order.taskId)}/operations/${entry.operationId}`))
    if (value.taskId !== order.taskId || value.operationId !== entry.operationId || value.state !== 'succeeded') {
      throw new Error('shipper.tasks.unknown')
    }
    const result = resultView(value.result, entry.order, entry.type)
    pending.delete(order.taskId)
    return result
  },
  complete: async (order, type, credential) => {
    if (pending.has(order.taskId)) {
      throw Object.assign(new Error('shipper.tasks.unknown'), { uncertain: true })
    }
    if (!order.taskId || order.assignmentVersion !== order.taskId || !Number.isSafeInteger(order.revision) || (type === 1 ? !order.canCollect : !order.canReturn)) {
      throw new Error('shipper.tasks.changed')
    }
    const operationId = crypto.randomUUID()
    pending.set(order.taskId, { operationId, type, order: { id: order.id, taskBoxNumber: order.taskBoxNumber } })
    try {
      const response = await authorizedAxios.post(`/wash-order/${encodeURIComponent(order.id)}/${type === 1 ? 'shipper-collect' : 'shipper-return'}`, { ...pick(credential, ['pinCode', 'qrCode']), taskId: order.taskId, expectedAssignmentVersion: order.assignmentVersion, expectedTaskType: type, expectedRevision: order.revision, expectedStatus: order.status, operationId })
      const result = resultView(unwrap(response), order, type)
      pending.delete(order.taskId)
      return result
    } catch (failure) {
      if (failure.uncertain || !failure.response || failure.response.status >= 500 || failure.response.status === 408) {
        failure.uncertain = true
      } else {
        pending.delete(order.taskId)
      }
      throw failure
    }
  }
}
