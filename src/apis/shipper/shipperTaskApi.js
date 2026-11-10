import authorizedAxios from '~/utils/authorizedAxios'
import { orderManagementApi } from '~/apis/orderManagementApi'

// Whitelist task metadata; credentials and customer details never enter list state.
const taskRow = (row) => Object.fromEntries(['id', 'revision', 'orderCode', 'merchantOrderCode', 'status', 'assignedTaskType', 'shipperAssignedAt', 'shipperNote', 'lockerId', 'lockerName', 'lockerAddress', 'lockerLatitude', 'lockerLongitude', 'lockerImageUrls', 'boxNumber', 'returnLockerId', 'returnLockerName', 'returnLockerAddress', 'returnLockerLatitude', 'returnLockerLongitude', 'returnLockerImageUrls', 'returnBoxNumber', 'isNew', 'serviceNames', 'taskLockerName', 'taskLockerAddress', 'taskLockerLatitude', 'taskLockerLongitude', 'taskLockerImageUrls', 'taskBoxNumber'].map((key) => [key, row[key]]))
export const shipperTaskApi = {
  list: async ({ keyword, taskType, page = 1, take = 12 } = {}, signal) => {
    const { data } = await authorizedAxios.post('/wash-order/filter', { keyword, taskType, pendingOnly: true, page, take, sortBy: [{ field: 'CreatedOn', isDescending: false }] }, { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isSafeInteger(data.total) || data.total < 0
      || data.list.some((row) => !row.id || !row.orderCode || ![1, 2].includes(row.assignedTaskType))) {
      throw new Error('shipper.invalidResponse')
    }
    return { list: data.list.map(taskRow), total: data.total, currentPage: page, totalPages: Math.ceil(data.total / take) }
  },
  detail: async (id, signal) => {
    const row = await orderManagementApi.detail(id, signal)
    // The task endpoints validate credentials on the server; never prefill from DTO secrets.
    const secrets = ['shipperTaskPinCode', 'shipperTaskQrString', 'depositPinCode', 'pickupPinCode', 'qrCodeString', 'pickupQrCodeString']
    return Object.fromEntries(Object.entries(row).filter(([key]) => !secrets.includes(key)))
  },
  credentials: async (id) => {
    const row = await orderManagementApi.detail(id)
    return Object.fromEntries(['id', 'revision', 'shipperId', 'assignedTaskType', 'nextAction', 'status', 'paymentStatus', 'lockerId', 'boxId', 'returnLockerId', 'returnBoxId', 'cancelledGoodsStatus', 'shipperTaskPinCode', 'shipperTaskQrString'].map((key) => [key, row[key]]))
  },
  complete: async (order, type, credential) => {
    const { data } = await authorizedAxios.post(`/wash-order/${encodeURIComponent(order.id)}/${type === 1 ? 'shipper-collect' : 'shipper-return'}`, { pinCode: credential.pinCode, qrCode: credential.qrCode })
    const result = data?.data
    const validState = type === 1 ? result?.status === 3 : result?.status === 10 || result?.status === 99 && result?.cancelledGoodsStatus === 3
    if (data?.succeeded !== true || result?.id !== order.id || result.shipperId !== order.shipperId || result.assignedTaskType !== type || !validState || type === 2 && !result.returnBoxNumber) {
      const error = new Error('shipper.tasks.unknown')
      error.uncertain = true
      throw error
    }
    return { status: result.status, boxNumber: type === 1 ? order.taskBoxNumber || order.boxNumber : result.returnBoxNumber }
  }
}
