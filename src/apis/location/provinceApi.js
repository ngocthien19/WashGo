import axios from 'axios'
import { ADDRESS_MAP } from '~/utils/config/constants'
import { containsMapPoint } from '~/utils/format/formats'

const client = axios.create({ timeout: ADDRESS_MAP.REQUEST_TIMEOUT_MS, withCredentials: false })
let provinces

export const provinceApi = {
  resolve: async (position, signal) => {
    if (signal?.aborted) {
      throw new axios.CanceledError()
    }
    if (!provinces) {
      const { data } = await client.get(`${import.meta.env.BASE_URL}data/customer/provinces/boundaries.json`, { signal })
      if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
        throw new Error('Invalid province boundaries')
      }
      provinces = data.features
    }
    const matches = provinces.filter((feature) => containsMapPoint(feature.geometry, position))
    // Simplified or shared borders must not be resolved by guessing the nearest province.
    return matches.length === 1 ? matches[0].properties.name : null
  }
}
