import authorizedAxios from '~/utils/http/authorizedAxios'
import { VIDEO_UPLOAD } from '~/utils/media/videos'
export const videoApi = {
  upload: async (file, signal) => {
    const body = new FormData(); body.append('file', file)
    const { data } = await authorizedAxios.post(VIDEO_UPLOAD.ENDPOINT, body, { signal, timeout: 120000 })
    if (data?.succeeded !== true || typeof data.data?.url !== 'string' || !data.data.url) {
      throw new Error('customer.sync.invalidResponse')
    }
    return data.data
  }
}
