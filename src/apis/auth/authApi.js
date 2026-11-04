import authorizedAxios from '~/utils/authorizedAxios'
import { AUTH_API_ENDPOINTS, GOOGLE_ADMIN_PORTAL_MESSAGE } from '~/utils/constants'

const unwrap = ({ data }) => {
  if (!data.succeeded) {
    throw new Error(data.message || 'auth.unableToCompleteTheRequest')
  }
  return data.data
}
const postPublic = (path, body) => authorizedAxios.post(path, body, { skipAuth: true }).then(unwrap)

const googleLogin = async (idToken) => {
  try {
    return await postPublic(AUTH_API_ENDPOINTS.GOOGLE_LOGIN, { idToken })
  } catch (error) {
    // Backend separates Customer sign-in from linked back-office Google accounts.
    const message = error.response?.data?.message || error.message || ''
    if (message.includes(GOOGLE_ADMIN_PORTAL_MESSAGE)) {
      return postPublic(AUTH_API_ENDPOINTS.GOOGLE_ADMIN_LOGIN, { idToken })
    }
    throw error
  }
}

export const authApi = {
  login: (body) => postPublic(AUTH_API_ENDPOINTS.LOGIN, body),
  googleLogin,
  sendOtp: (body) => postPublic(AUTH_API_ENDPOINTS.SEND_OTP, body),
  verifyOtp: (body) => postPublic(AUTH_API_ENDPOINTS.VERIFY_OTP, body),
  register: (body) => postPublic(AUTH_API_ENDPOINTS.REGISTER, body),
  resetPassword: (body) => postPublic(AUTH_API_ENDPOINTS.RESET_PASSWORD, body),
  getMe: () => authorizedAxios.get(AUTH_API_ENDPOINTS.ME).then(unwrap),
  logout: (refreshToken) => authorizedAxios.post(AUTH_API_ENDPOINTS.LOGOUT, { refreshToken }).then(unwrap)
}
