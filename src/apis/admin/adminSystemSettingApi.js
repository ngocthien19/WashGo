import { adminWrite, versionGuard } from './adminWrite'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { settingPayload, validSettings } from '~/pages/admin/SystemSettings/settingModel'

const unwrap = response => {
  if (response.data?.succeeded !== true || !validSettings(response.data.data)) {
    throw new Error('admin.invalidResponse')
  }
  return response.data.data
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
    const body = settingPayload(group, values)
    const action = { sla: 'Sla', commission: 'Commission', penalty: 'Penalty' }[group]
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
