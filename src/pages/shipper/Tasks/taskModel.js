import * as yup from 'yup'

export const TASK_TAKE = 12
export const readTaskQuery = (params) => ({
  keyword: (params.get('keyword') || '').trim(),
  taskType: ['1', '2'].includes(params.get('taskType')) ? params.get('taskType') : '',
  page: /^[1-9]\d{0,5}$/.test(params.get('page') || '1') ? Number(params.get('page') || 1) : 1
})
export const taskFilter = (query) => ({ keyword: query.keyword || undefined, taskType: query.taskType ? Number(query.taskType) : undefined, page: query.page, take: TASK_TAKE })
export const taskParams = (query) => Object.fromEntries(['keyword', 'taskType', 'page'].filter((key) => query[key] !== '' && !(key === 'page' && query.page === 1)).map((key) => [key, String(query[key])]))
export const taskSnapshot = (row) => JSON.stringify(['id', 'revision', 'shipperId', 'assignedTaskType', 'nextAction', 'status', 'paymentStatus', 'lockerId', 'boxId', 'returnLockerId', 'returnBoxId', 'cancelledGoodsStatus'].map((key) => row[key] ?? null))
export const canCompleteTask = (row, shipperId) => Boolean(shipperId && row?.shipperId === shipperId && [1, 2].includes(row.nextAction) && row.nextAction === row.assignedTaskType)
export const credentialSchema = yup.object({
  mode: yup.string().oneOf(['pin', 'qr']).required(),
  pinCode: yup.string().trim().when('mode', { is: 'pin', then: (schema) => schema.required().matches(/^\d{6}$/) }),
  qrCode: yup.string().trim().when('mode', { is: 'qr', then: (schema) => schema.required().max(200) }),
  confirmed: yup.boolean().oneOf([true]).required()
})
export const matchesTaskQr = (value, orderCode, type) => {
  const parts = value.trim().split(':')
  return parts.length === 4 && parts[0].toUpperCase() === 'WASHGO' && parts[1].toUpperCase() === (type === 1 ? 'COLLECT' : 'RETURN') && parts[2].toUpperCase() === orderCode.toUpperCase() && /^\d{6}$/.test(parts[3])
}
