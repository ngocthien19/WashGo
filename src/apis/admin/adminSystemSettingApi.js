import { adminWrite, versionGuard } from './adminWrite'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { settingPayload, validSettings } from '~/pages/admin/SystemSettings/settingModel'

const unwrap = response => {
  const original = response.data?.data
  const value = original && { ...original, ...(original.loyaltyEarnPercent == null ? {} : { earnPercent: original.loyaltyEarnPercent }), ...(original.loyaltyMaxUsePercent == null ? {} : { maxUsePercent: original.loyaltyMaxUsePercent }) }
  if (response.data?.succeeded !== true || !validSettings(value)) {
    throw new Error('admin.invalidResponse')
  }
  return value
}
export const adminSystemSettingApi = {
  get: signal => authorizedAxios.get('/system-setting', { signal }).then(unwrap),
  history: async (query, signal) => {
    const { data } = await authorizedAxios.post('/system-setting/history/filter', query, { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total)) {
      throw new Error('admin.invalidResponse')
    }
    return data
  },
  update: async (group, values, version) => {
    if (!['loyalty', 'sla', 'commission', 'penalty'].includes(group)) {
      throw new Error('admin.invalidResponse')
    }
    const body = settingPayload(group, values)
    const action = { loyalty: 'Loyalty', sla: 'Sla', commission: 'Commission', penalty: 'Penalty' }[group]
    const response = await adminWrite('SystemSetting', action, null, 'put', `/system-setting/${group}`, { ...body, ...versionGuard(version) })
    try {
      const data = unwrap(response)
      if (!Object.keys(body).every(key => data[key] === body[key])) {
        throw new Error('admin.invalidResponse')
      }
      return data
    } catch {
      const failure = new Error('admin.invalidResponse'); failure.uncertain = true; throw failure
    }
  }
}
