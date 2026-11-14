import axios from 'axios'
import { ADDRESS_MAP } from '~/utils/config/constants'
import { formatMapAddress, hasCoordinates } from '~/utils/format/formats'
import { provinceApi } from './provinceApi'

// External geocoding must never receive the WashGo Bearer token.
const geocoder = axios.create({ timeout: ADDRESS_MAP.REQUEST_TIMEOUT_MS, withCredentials: false })
const cache = new Map()
let lastRequestAt = 0

export const addressApi = {
  reverse: async (position, signal) => {
    if (signal?.aborted) {
      throw new axios.CanceledError()
    }
    if (!hasCoordinates(position)) {
      throw new Error('customer.addressMap.invalidPosition')
    }
    const lat = position.latitude.toFixed(ADDRESS_MAP.COORDINATE_PRECISION)
    const lon = position.longitude.toFixed(ADDRESS_MAP.COORDINATE_PRECISION)
    const key = `${lat},${lon}`
    if (cache.has(key)) {
      return cache.get(key)
    }
    const now = Date.now()
    const startAt = Math.max(now, lastRequestAt + ADDRESS_MAP.REQUEST_INTERVAL_MS)
    await new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new axios.CanceledError())
        return
      }
      const cancel = () => {
        clearTimeout(timer)
        reject(new axios.CanceledError())
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', cancel)
        resolve()
      }, Math.max(0, startAt - now))
      signal?.addEventListener('abort', cancel, { once: true })
    })
    lastRequestAt = Date.now()
    const { data } = await geocoder.get(ADDRESS_MAP.REVERSE_URL, {
      signal,
      params: { lat, lon, lang: 'default', limit: 1, radius: ADDRESS_MAP.REVERSE_RADIUS_KM }
    })
    const properties = data.features?.[0]?.properties
    if (!properties) {
      throw new Error('customer.addressMap.noResult')
    }
    const result = formatMapAddress(properties)
    if (!result.address) {
      throw new Error('customer.addressMap.noResult')
    }
    if (properties.countrycode?.toLowerCase() === 'vn') {
      try {
        const province = await provinceApi.resolve(position, signal)
        if (province) {
          result.city = province
        }
        result.boundaryStatus = province ? 'matched' : 'unavailable'
      } catch (error) {
        if (signal?.aborted || axios.isCancel(error)) {
          throw error
        }
        result.boundaryStatus = 'error'
      }
    }
    if (cache.size >= ADDRESS_MAP.CACHE_LIMIT) {
      cache.delete(cache.keys().next().value)
    }
    if (result.boundaryStatus !== 'error') {
      cache.set(key, result)
    }
    return result
  }
}
