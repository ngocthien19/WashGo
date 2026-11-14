import * as yup from 'yup'
import { INCIDENT_CONFIG, INCIDENT_TYPES, INCIDENT_SEVERITIES, ORDER_STATUSES } from '~/utils/config/constants'
import { validDay, validRange, dateRangeFilter } from '~/utils/format/dateRange'

export const incidentListFilter = (params) => {
  const status = Number(params.get('status')), type = Number(params.get('type'))
  const from = validDay(params.get('from') || '') ? params.get('from') : ''
  const to = validDay(params.get('to') || '') ? params.get('to') : ''
  return { page: readIncidentPage(params), take: INCIDENT_CONFIG.PAGE_SIZE, keyword: (params.get('keyword') || '').trim().slice(0, 200), statuses: [1, 2, 3, 4].includes(status) ? [status] : undefined, types: INCIDENT_TYPES.includes(type) ? [type] : undefined, sort: ['newest', 'oldest', 'status'].includes(params.get('sort')) ? params.get('sort') : 'newest', ...(validRange(from, to) ? dateRangeFilter({ from, to }) : {}) }
}

export const incidentSchema = yup.object({
  type: yup.number().oneOf(INCIDENT_TYPES, 'customer.incidents.chooseType').required('customer.incidents.chooseType'),
  severity: yup.number().oneOf(INCIDENT_SEVERITIES, 'customer.incidents.chooseSeverity').required('customer.incidents.chooseSeverity'),
  description: yup.string().trim().required('customer.incidents.descriptionRequired').max(INCIDENT_CONFIG.DESCRIPTION_MAX, 'customer.incidents.descriptionMax')
})

export const incidentReportDeadline = (order) => {
  const timestamps = (order.timeline || []).filter((event) => event.status === ORDER_STATUSES.COMPLETED && Number.isFinite(event.timestamp) && event.timestamp > 0).map((event) => event.timestamp)
  return timestamps.length ? (Math.max(...timestamps) + INCIDENT_CONFIG.REPORT_WINDOW_DAYS * 86400) * 1000 : null
}

export const readIncidentPage = (params) => {
  const value = Number(params.get('page'))
  return Number.isSafeInteger(value) && value > 0 ? value : 1
}
