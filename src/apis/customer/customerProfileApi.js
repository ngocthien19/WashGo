import authorizedAxios from '~/utils/authorizedAxios'
import { CUSTOMER_API_ENDPOINTS, IMAGE_UPLOAD } from '~/utils/constants'

const unwrap = ({ data }) => {
  if (!data.succeeded || !data.data) {
    throw new Error(data.message || 'customer.profile.requestError')
  }
  return data.data
}

export const customerProfileApi = {
  getProfile: (signal) => authorizedAxios.get(CUSTOMER_API_ENDPOINTS.PROFILE, { signal }).then(unwrap),
  updateProfile: (body, signal) => authorizedAxios.put(CUSTOMER_API_ENDPOINTS.PROFILE, body, { signal }).then(unwrap),
  uploadAvatar: (file, signal) => {
    const body = new FormData()
    body.append('file', file)
    return authorizedAxios.post(IMAGE_UPLOAD.ENDPOINT, body, { signal }).then(unwrap)
  }
}
