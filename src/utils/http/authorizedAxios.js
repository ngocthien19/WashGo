import axios from 'axios'
import { API_TIMEOUT_MS, AUTH_API_ENDPOINTS } from '~/utils/config/constants'
import { resolveApiUrl } from './apiConfig'
import { accountAccessIssue, accountAccessReason } from '~/utils/auth/accountAccess'

export const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL, import.meta.env.PROD)
const authorizedAxios = axios.create({ baseURL: API_URL, timeout: API_TIMEOUT_MS })
let session = { getAuth: () => null, setSession: () => {}, clearSession: () => {} }
let refreshPromise = null

// Inject store access to keep the API layer independent of Redux imports.
export const configureAxiosSession = (handlers) => {
  session = handlers
}
authorizedAxios.interceptors.request.use((config) => {
  if (!config.skipAuth) {
    const token = session.getAuth()?.accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})
authorizedAxios.interceptors.response.use((response) => response, async (error) => {
  const request = error.config
  const accessIssue = accountAccessIssue(error)
  if (request && !request.skipAuth && accessIssue && session.getAuth()?.accessToken
    && request.headers?.Authorization === `Bearer ${session.getAuth().accessToken}`) {
    session.clearSession(accessIssue, accountAccessReason(error))
    throw error
  }
  if (!request || request.skipAuth || error.response?.status !== 401) {
    throw error
  }
  const auth = session.getAuth()
  if (!auth?.accessToken || request.headers?.Authorization !== `Bearer ${auth.accessToken}`) {
    throw error
  }
  if (request._retry || !auth?.refreshToken) {
    if (auth?.accessToken && request.headers?.Authorization === `Bearer ${auth.accessToken}`) {
      session.clearSession('sessionEnded')
    }
    throw error
  }
  request._retry = true
  // Concurrent 401 responses share one refresh request because tokens rotate.
  if (!refreshPromise) {
    refreshPromise = axios.post(`${API_URL}${AUTH_API_ENDPOINTS.REFRESH_TOKEN}`, {
      refreshToken: auth.refreshToken
    }, { timeout: API_TIMEOUT_MS }).then(({ data }) => {
      if (!data.succeeded || !data.data?.accessToken) {
        const failure = new Error(data.message || 'auth.yourSessionIsInvalid')
        failure.response = { data, status: 401 }
        throw failure
      }
      if (session.getAuth()?.refreshToken !== auth.refreshToken) {
        throw new axios.CanceledError('auth.yourSessionHasChanged')
      }
      session.setSession(data.data)
      return data.data
    }).catch((refreshError) => {
      const sessionUnchanged = session.getAuth()?.refreshToken === auth.refreshToken
      const invalidRefreshToken = [400, 401, 403].includes(refreshError.response?.status)
      const invalidResponse = !refreshError.response && !axios.isAxiosError(refreshError)

      if (sessionUnchanged && (invalidRefreshToken || invalidResponse)) {
        session.clearSession(accountAccessIssue(refreshError) || 'sessionEnded', accountAccessReason(refreshError))
      }
      throw refreshError
    }).finally(() => {
      refreshPromise = null
    })
  }
  const refreshed = await refreshPromise
  request.headers.Authorization = `Bearer ${refreshed.accessToken}`
  return authorizedAxios(request)
})
export default authorizedAxios
