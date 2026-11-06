import authorizedAxios from '~/utils/authorizedAxios'
import { CUSTOMER_API_ENDPOINTS } from '~/utils/constants'
import { customerImageApi } from './customerImageApi'

const unwrap = ({ data }) => {
  if (!data.succeeded || !data.data) {
    throw new Error(data.message || 'customer.profile.requestError')
  }
  return data.data
}

export const customerProfileApi = {
  getProfile: (signal) => authorizedAxios.get(CUSTOMER_API_ENDPOINTS.PROFILE, { signal }).then(unwrap),
  updateProfile: (body, signal) => authorizedAxios.put(CUSTOMER_API_ENDPOINTS.PROFILE, body, { signal }).then(unwrap),
  uploadAvatar: customerImageApi.upload
}
