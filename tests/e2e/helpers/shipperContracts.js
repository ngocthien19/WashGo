export const taskDto = order => ({ taskId: order.taskId || order.id, assignmentVersion: order.taskId || order.id, orderId: order.id, orderCode: order.orderCode, merchantOrderCode: order.merchantOrderCode, taskType: order.assignedTaskType, status: order.nextAction ? 1 : 2, orderStatus: order.status, orderRevision: order.revision, canCollect: order.nextAction === 1, canReturn: order.nextAction === 2, taskLockerName: order.taskLockerName || order.lockerName, taskLockerAddress: order.taskLockerAddress || order.lockerAddress, taskLockerImageUrls: order.taskLockerImageUrls || order.lockerImageUrls || [], taskLockerLatitude: order.assignedTaskType === 1 ? order.lockerLatitude : order.returnLockerLatitude, taskLockerLongitude: order.assignedTaskType === 1 ? order.lockerLongitude : order.returnLockerLongitude, taskBoxNumber: order.taskBoxNumber || order.boxNumber, assignedAt: order.shipperAssignedAt, note: order.shipperNote, merchantName: order.merchantName, deadline: order.deadline, serverNow: '2026-11-12T01:00:00Z', order: { ...order, merchantPhoneNumber: order.merchantPhone } })
export async function securityRoutes(route) {
  const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
  const ok = data => route.fulfill({ json: { succeeded: true, data } })
  if (path === '/auth/security') {
    await ok({ hasPassword: true, googleLinked: false, twoFactorSupported: false, twoFactorEnabled: false, activeSessions: 0 }); return true
  }
  if (path === '/auth/sessions') {
    await ok({ total: 0, page: 1, take: 10, hasMore: false, current: null, items: [] }); return true
  }
  if (path === '/shipper-profile/activities') {
    await route.fulfill({ json: { succeeded: true, list: [], total: 0 } }); return true
  }
  return false
}
