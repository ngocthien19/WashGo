import authorizedAxios from '~/utils/http/authorizedAxios'
import { IMAGE_UPLOAD } from '~/utils/config/constants'

export const imageApi = {
  upload: async (file, signal) => {
    const body = new FormData()
    body.append('file', file)
    const { data } = await authorizedAxios.post(IMAGE_UPLOAD.ENDPOINT, body, { signal })
    if (data?.succeeded !== true || !data.data?.url) {
      throw new Error(data?.message || 'customer.profile.requestError')
    }
    return data.data
  }
}
