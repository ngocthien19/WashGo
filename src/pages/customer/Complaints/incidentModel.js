import * as yup from 'yup'
import { INCIDENT_CONFIG, INCIDENT_TYPES, INCIDENT_SEVERITIES, ORDER_STATUSES } from '~/utils/constants'

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
