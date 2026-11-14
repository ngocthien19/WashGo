import { adminWrite, versionGuard, administrativeSummary } from './adminWrite'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { isId } from '~/pages/admin/Merchants/merchantModel'
import { adminLockerApi } from './adminLockerApi'
import { customerContact, merchantContact } from '~/pages/admin/Complaints/complaintContacts'

const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]))
const invalid = () => new Error('admin.invalidResponse')
const media = item => ['imageUrls', 'videoUrls'].every(key => item[key] == null || Array.isArray(item[key]) && item[key].every(url => typeof url === 'string'))
const valid = item => isId(item?.id) && isId(item.orderId) && isId(item.customerId) && typeof item.orderCode === 'string' && typeof item.customerName === 'string' && typeof item.description === 'string' && [1, 2, 3, 4].includes(item.status) && [1, 2, 3].includes(item.type) && [1, 2, 3].includes(item.severity) && [0, 1, 2].includes(item.compensationStatus) && Number.isFinite(item.compensationAmount) && media(item)
const message = (item, id) => isId(item?.id) && item.incidentId === id && typeof item.content === 'string' && typeof item.senderName === 'string' && ['Admin', 'Customer'].includes(item.senderRole) && media(item)
const unwrap = (response, validate) => {
  if (response.data?.succeeded !== true || !validate(response.data.data)) {
    throw invalid()
  }
  return response.data.data
}
const write = async (path, body, validate, version, action, id) => {
  const response = await adminWrite('Incident', action, id, 'post', path, { ...body, ...versionGuard(version) })
  try {
    return unwrap(response, validate)
  } catch {
    const error = invalid(); error.uncertain = true; throw error
  }
}
export const compensationKeys = ['compensationLightPercent', 'compensationMediumPercent', 'compensationSeverePercent', 'compensationLostPercent']
export const adminComplaintApi = {
  merchants: adminLockerApi.merchants,
  contacts: async (incident, signal) => {
    const customer = customerContact(incident), merchant = merchantContact(incident)
    if ('contactBasis' in incident) {
      return { customer, merchant }
    }
    const jobs = []
    if (!customer.phone && isId(incident.orderId)) {
      jobs.push({ kind: 'customer', path: `/wash-order/${incident.orderId}`, validate: value => value?.id === incident.orderId && value.customerId === incident.customerId })
    }
    if (isId(incident.merchantId) && (!merchant.email || !merchant.phone || !merchant.imageUrls.length)) {
      jobs.push({ kind: 'merchant', path: `/merchant/${incident.merchantId}`, validate: value => value?.id === incident.merchantId })
    }
    const results = await Promise.allSettled(jobs.map(job => authorizedAxios.get(job.path, { signal }).then(response => unwrap(response, job.validate))))
    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') {
        return
      }
      const value = result.value
      if (jobs[index].kind === 'customer') {
        customer.phone = customerContact({ customerPhoneNumber: value.customerPhoneNumber }).phone
      } else {
        Object.assign(merchant, merchantContact(incident, { name: value.businessName, email: value.email, phone: value.phone, imageUrls: Array.isArray(value.imageUrls) ? value.imageUrls : [] }))
      }
    })
    return { customer, merchant }
  },
  list: async (query, signal) => {
    const { data } = await authorizedAxios.post('/incident/filter', pick(query, ['keyword', 'status', 'severity', 'type', 'merchantId', 'fromDate', 'toDate', 'page', 'take', 'compensationStatus', 'orderId', 'customerId', 'sortBy']), { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(valid) || !Number.isInteger(data.total) || data.total < 0) {
      throw invalid()
    }
    return { ...data, currentPage: query.page, totalPages: Math.ceil(data.total / query.take) }
  },
  summary: async signal => {
    const value = await administrativeSummary('/incident/summary', signal); return [value.total, value.counts.Pending || 0, value.counts.Resolved || 0, value.counts.Rejected || 0]
  },
  detail: (id, signal) => authorizedAxios.get(`/incident/${encodeURIComponent(id)}`, { signal }).then(response => unwrap(response, value => valid(value) && value.id === id)),
  settings: signal => authorizedAxios.get('/system-setting', { signal }).then(response => unwrap(response, value => compensationKeys.every(key => Number.isInteger(value?.[key]) && value[key] >= 0 && value[key] <= 1000))).then(value => pick(value, [...compensationKeys, 'version'])),
  resolve: (id, body) => write(`/incident/${encodeURIComponent(id)}/resolve`, pick(body, ['resolutionNote', 'responsibleParty', 'compensationLevel', 'itemValue', 'expectedSettingsVersion']), item => valid(item) && item.id === id && item.status === 2, body.expectedVersion, 'Resolve', id),
  reject: (id, reason, version) => write(`/incident/${encodeURIComponent(id)}/reject`, { reason }, item => valid(item) && item.id === id && item.status === 3, version, 'Reject', id),
  pay: (id, reference, version, proofImageUrls = []) => write(`/incident/${encodeURIComponent(id)}/confirm-compensation`, { reference, proofImageUrls }, item => valid(item) && item.id === id && item.status === 2 && item.compensationStatus === 2 && item.compensationReference === reference, version, 'ConfirmCompensation', id),
  messagesPage: async (id, page, signal) => {
    const { data } = await authorizedAxios.get(`/incident/${encodeURIComponent(id)}/messages/page`, { params: { page, take: 10 }, signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || data.list.some(item => !message(item, id)) || !Number.isInteger(data.total)) {
      throw invalid()
    }
    return data
  },
  messages: (id, signal) => authorizedAxios.get(`/incident/${encodeURIComponent(id)}/messages`, { signal }).then(response => unwrap(response, items => Array.isArray(items) && items.every(item => message(item, id)))),
  message: (id, body) => write(`/incident/${encodeURIComponent(id)}/messages`, pick(body, ['content', 'imageUrls', 'videoUrls']), item => message(item, id) && item.senderRole === 'Admin', body.expectedVersion, 'Message', id)
}
