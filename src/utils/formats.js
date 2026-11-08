import { EARTH_RADIUS_KM, LANGUAGE_OPTIONS } from './constants'
import i18n from '~/i18n'
import { API_URL } from '~/utils/authorizedAxios'

const getLocale = () => LANGUAGE_OPTIONS.find((option) => option.value === i18n.resolvedLanguage)?.locale || LANGUAGE_OPTIONS[0].locale

export const formatNumber = (value) => Number.isFinite(value)
  ? new Intl.NumberFormat(getLocale()).format(value) : '—'

export const formatDurationMinutes = (value) => {
  if (!Number.isFinite(value) || value < 0) {
    return '—'
  }
  const minutes = Math.floor(value)
  const parts = [['day', Math.floor(minutes / 1440)], ['hour', Math.floor(minutes % 1440 / 60)], ['minute', minutes % 60]]
  return parts.filter(([unit, count]) => count > 0 || unit === 'minute' && minutes === 0)
    .map(([unit, count]) => new Intl.NumberFormat(getLocale(), { style: 'unit', unit, unitDisplay: 'long', useGrouping: false }).format(count)).join(' ')
}

export const formatDateTime = (value) => {
  if (!value) {
    return '—'
  }
  const date = new Date(typeof value === 'number' ? value * 1000 : value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export const getImageUrl = (value) => {
  if (!value?.startsWith('/uploads/')) {
    return value || ''
  }
  // Local uploads are served by the backend, not the frontend asset server.
  return /^https?:\/\//i.test(API_URL)
    ? new URL(value, API_URL).href
    : `${API_URL.replace(/\/$/, '')}${value}`
}

export const hasControlCharacters = (value) => [...value].some((character) => {
  const code = character.charCodeAt(0)
  return code < 32 || (code >= 127 && code <= 159)
})

export const formatCountdown = (seconds) => {
  const remaining = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(remaining / 60)
  const remainder = String(remaining % 60).padStart(2, '0')
  return `${minutes}:${remainder}`
}

export const normalizePhone = (value = '') => value.replace(/\D/g, '')

export const hasCoordinates = (value) => Number.isFinite(value?.latitude)
  && Number.isFinite(value?.longitude) && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180

export const containsMapPoint = (geometry, position) => {
  if (!hasCoordinates(position)) {
    return false
  }
  const x = position.longitude
  const y = position.latitude
  const inRing = (ring) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      const cross = (x - xi) * (yj - yi) - (y - yi) * (xj - xi)
      if (Math.abs(cross) < 1e-12 && x >= Math.min(xi, xj) && x <= Math.max(xi, xj)
        && y >= Math.min(yi, yj) && y <= Math.max(yi, yj)) {
        return true
      }
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
        inside = !inside
      }
    }
    return inside
  }
  const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates]
    : geometry?.type === 'MultiPolygon' ? geometry.coordinates : []
  return polygons.some((rings) => rings.length > 0 && inRing(rings[0])
    && !rings.slice(1).some(inRing))
}

export const formatMapAddress = (properties = {}) => {
  const clean = (value) => typeof value === 'string' ? value.trim() : ''
  const city = clean(properties.state) || clean(properties.city)
  const ward = clean(properties.district)
  const street = [clean(properties.housenumber), clean(properties.street)].filter(Boolean).join(' ')
  const isAdministrative = ['city', 'county', 'state', 'country', 'district'].includes(properties.type)
  const place = street || (!isAdministrative ? clean(properties.name) : '')
  // Use the current two-level address; Photon district is a ward, not a legacy county.
  const address = [...new Set([place, ward !== city ? ward : '']
    .filter(Boolean))].join(', ')
  return { address, district: '', city }
}

export const getDistanceKm = (from, to) => {
  if (!hasCoordinates(from) || !hasCoordinates(to)) {
    return null
  }
  const radians = (degrees) => degrees * Math.PI / 180
  const latitudeDelta = radians(to.latitude - from.latitude)
  const longitudeDelta = radians(to.longitude - from.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))))
}

export const formatLockerAddress = (locker) => [...new Set([
  locker.address, locker.ward, locker.district, locker.city
].filter(Boolean))].join(', ')

export const formatDistance = (value) => Number.isFinite(value) && value >= 0
  ? `${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(value)} km`
  : ''

export const getLockerMapLink = (locker) => hasCoordinates(locker)
  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${locker.latitude},${locker.longitude}`)}`
  : null

export const formatCurrency = (value) => Number.isFinite(Number(value)) && value != null
  ? new Intl.NumberFormat(getLocale(), { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value))
  : i18n.t('common.priceUnavailable')

export const getInitials = (name = '') => name.trim().split(/\s+/).filter(Boolean).slice(-2)
  .map((part) => part[0]).join('').toUpperCase() || 'WG'

export const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 'end-ellipsis', totalPages]
  }
  if (currentPage >= totalPages - 2) {
    return [1, 'start-ellipsis', totalPages - 2, totalPages - 1, totalPages]
  }
  return [1, 'start-ellipsis', currentPage, 'end-ellipsis', totalPages]
}
