import { EARTH_RADIUS_KM } from './constants'

export const formatCountdown = (seconds) => {
  const remaining = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(remaining / 60)
  const remainder = String(remaining % 60).padStart(2, '0')
  return `${minutes}:${remainder}`
}

export const normalizePhone = (value = '') => value.replace(/\D/g, '')

export const hasCoordinates = (value) => Number.isFinite(value?.latitude)
  && Number.isFinite(value?.longitude) && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180

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
  ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} km`
  : ''

export const getLockerMapLink = (locker) => hasCoordinates(locker)
  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${locker.latitude},${locker.longitude}`)}`
  : null

const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export const formatCurrency = (value) => Number.isFinite(Number(value)) && value != null
  ? currencyFormatter.format(Number(value))
  : 'Chưa có giá'

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
