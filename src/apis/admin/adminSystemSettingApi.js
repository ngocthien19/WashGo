import authorizedAxios from '~/utils/authorizedAxios'
import { settingPayload, validSettings } from '~/pages/admin/SystemSettings/settingModel'

const unwrap = response => {
  if (response.data?.succeeded !== true || !validSettings(response.data.data)) {
    throw new Error('admin.invalidResponse')
  }
  return response.data.data
}
export const adminSystemSettingApi = {
  get: signal => authorizedAxios.get('/system-setting', { signal }).then(unwrap),
  update: async (group, values) => {
    const body = settingPayload(group, values)
    const response = await authorizedAxios.put(`/system-setting/${group}`, body)
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
