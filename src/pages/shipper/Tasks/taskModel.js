import { validRange, dateRangeFilter } from '~/utils/dateRange'
import * as yup from 'yup'

export const TASK_TAKE = 12
export const readTaskQuery = (params) => {
  const from = params.get('from') || '', to = params.get('to') || ''
  const valid = validRange(from, to) && (!from || !to || (Date.parse(to) - Date.parse(from)) / 86400000 < 366)
  return ({
    keyword: (params.get('keyword') || '').trim().slice(0, 200),
    taskType: ['1', '2'].includes(params.get('taskType')) ? params.get('taskType') : '',
    taskStatus: ['1', '2', '3', '4'].includes(params.get('taskStatus')) ? params.get('taskStatus') : '1',
    from: valid ? from : '', to: valid ? to : '', invalidDates: !valid,
    sort: ['AssignedAt', 'Deadline'].includes(params.get('sort')) ? params.get('sort') : 'AssignedAt',
    page: /^[1-9]\d{0,5}$/.test(params.get('page') || '1') ? Number(params.get('page') || 1) : 1
  })
}
export const taskFilter = (query) => ({ keyword: query.keyword || undefined, taskType: query.taskType ? Number(query.taskType) : undefined, taskStatus: Number(query.taskStatus || 1), ...(validRange(query.from, query.to) ? { assignedFrom: dateRangeFilter(query).fromDate, assignedTo: dateRangeFilter(query).toDate } : {}), sortBy: [{ field: query.sort || 'AssignedAt', isDescending: false }], page: query.page, take: TASK_TAKE })
export const taskParams = (query) => Object.fromEntries(['keyword', 'taskType', 'taskStatus', 'from', 'to', 'sort', 'page'].filter((key) => query[key] !== '' && query[key] !== undefined && !(key === 'page' && query.page === 1)).map((key) => [key, String(query[key])]))
export const taskSnapshot = (row) => JSON.stringify(['id', 'revision', 'taskId', 'assignmentVersion', 'canCollect', 'canReturn', 'shipperId', 'assignedTaskType', 'nextAction', 'status', 'paymentStatus', 'lockerId', 'boxId', 'returnLockerId', 'returnBoxId', 'cancelledGoodsStatus'].map((key) => row[key] ?? null))
export const canCompleteTask = (row, shipperId) => Boolean(shipperId && row?.shipperId === shipperId && row?.taskId && row.assignmentVersion === row.taskId && Number.isSafeInteger(row.revision) && (row.nextAction === 1 ? row.canCollect : row.canReturn) && [1, 2].includes(row.nextAction) && row.nextAction === row.assignedTaskType)
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
